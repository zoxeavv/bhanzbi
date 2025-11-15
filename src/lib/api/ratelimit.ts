import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate limiting result
 */
export interface RateLimitResult {
  ok: boolean;
  retryAfter?: number;
}

/**
 * Get client IP from request headers
 * Handles x-forwarded-for header (used by proxies/load balancers)
 * Falls back to "unknown" if IP cannot be determined
 */
function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }
  
  return 'unknown';
}

/**
 * Initialize Redis client for rate limiting
 * Uses environment variables for Upstash Redis connection
 * Returns null if Upstash is not configured (fail-open behavior)
 */
function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!url || !token) {
    return null;
  }
  
  return new Redis({
    url,
    token,
  });
}

/**
 * Initialize rate limiter with default policy: 10 requests per 10 seconds
 * Returns null if Upstash is not configured (fail-open behavior)
 */
function getRateLimiter(): Ratelimit | null {
  const redis = getRedisClient();
  
  if (!redis) {
    return null;
  }
  
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '10 s'),
  });
}

/**
 * Rate limit a request based on client IP and optional key hint
 * 
 * @param request - The incoming Request object
 * @param keyHint - Optional hint to compose the rate limit key (e.g., "auth", "clients")
 * @returns Rate limit result with ok status and optional retryAfter seconds
 * 
 * @example
 * ```ts
 * const result = await limitRequest(request);
 * if (!result.ok) {
 *   return new Response('Too Many Requests', { 
 *     status: 429,
 *     headers: { 'Retry-After': result.retryAfter?.toString() ?? '10' }
 *   });
 * }
 * ```
 * 
 * @example
 * ```ts
 * // Rate limit per endpoint
 * const result = await limitRequest(request, 'auth');
 * ```
 */
export async function limitRequest(
  request: Request,
  keyHint?: string
): Promise<RateLimitResult> {
  // Fail-open: if Upstash is not configured, allow all requests
  const rateLimiter = getRateLimiter();
  if (!rateLimiter) {
    const env = process.env.NODE_ENV || 'development';
    if (env !== 'production') {
      console.warn('[RateLimit] Upstash not configured, skipping rate limit');
    }
    return {
      ok: true,
    };
  }

  try {
    const clientIp = getClientIp(request);
    
    // Compose rate limit key: use IP as base, append keyHint if provided
    const rateLimitKey = keyHint ? `${clientIp}:${keyHint}` : clientIp;
    
    const result = await rateLimiter.limit(rateLimitKey);
    
    // Calculate retryAfter in seconds
    // result.reset is Unix timestamp in seconds
    // Date.now() is milliseconds, so divide by 1000 to get seconds
    const retryAfter = result.success 
      ? undefined 
      : Math.max(0, Math.ceil(result.reset - Math.floor(Date.now() / 1000)));
    
    return {
      ok: result.success,
      retryAfter,
    };
  } catch (error) {
    // If rate limiting fails (e.g., Redis unavailable), fail open
    // Log error in development only, but don't block the request
    if (process.env.NODE_ENV === 'development') {
      console.error('[RateLimit] Error checking rate limit:', error);
    }
    
    // Fail open: allow request if rate limiting service is unavailable
    return {
      ok: true,
    };
  }
}

