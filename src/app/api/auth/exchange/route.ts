import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { limitRequest } from '@/lib/api/ratelimit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Helper pour vérifier le rate limiting et retourner 429 si nécessaire
 */
async function checkRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const rateLimitResult = await limitRequest(request, 'auth-exchange');
  if (!rateLimitResult.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }
  return null;
}

/**
 * API endpoint to exchange client-side auth tokens for server-side cookies.
 * 
 * After a successful login on the client side (via signInWithPassword),
 * the client calls this endpoint with the access_token and refresh_token
 * to synchronize the session to server-side cookies that the middleware
 * can read.
 * 
 * This endpoint:
 * 1. Receives access_token and refresh_token from the client
 * 2. Uses createServerClient to call setSession() which sets the cookies
 * 3. Returns success so the client can redirect to /dashboard
 * 
 * Pattern: Client login → Exchange tokens → Cookies set → Middleware can validate
 */
export async function POST(request: NextRequest) {
  const rateLimitError = await checkRateLimit(request);
  if (rateLimitError) return rateLimitError;

  try {
    const body = await request.json();
    const { access_token, refresh_token } = body;

    // Validate payload
    if (!access_token || !refresh_token) {
      return NextResponse.json(
        { error: 'Missing access_token or refresh_token' },
        { status: 400 }
      );
    }

    // Create response first so we can set cookies on it
    const response = NextResponse.json({ ok: true });
    const cookieStore = await cookies();

    // Create server client with cookie handling
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Set cookies on both the cookieStore and response
            cookieStore.set(name, value, options);
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    // Set the session using the tokens from the client
    // This will create the sb-<project-ref>-auth-token cookies
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      console.error('[POST /api/auth/exchange] Error setting session:', error);
      return NextResponse.json(
        { error: 'Failed to set session', details: error.message },
        { status: 401 }
      );
    }

    // Verify the session was set correctly
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('[POST /api/auth/exchange] Session not found after setSession');
      return NextResponse.json(
        { error: 'Session not found after exchange' },
        { status: 401 }
      );
    }

    console.log('[POST /api/auth/exchange] Session exchanged successfully:', {
      userId: session.user.id,
      email: session.user.email,
    });

    // Return the response with cookies set
    return response;
  } catch (error) {
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }
    
    console.error('[POST /api/auth/exchange] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

