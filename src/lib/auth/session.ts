import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import type { Session, User } from '@/types/domain';
import type { NextRequest } from 'next/server';

function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getSupabaseConfig() {
  // Lazy evaluation for Edge Runtime compatibility
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  return { url, key };
}

// Lazy client creation for Edge Runtime compatibility
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const { url, key } = getSupabaseConfig();
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

async function validateSessionWithClient(client: SupabaseClient): Promise<Session> {
  try {
    const { data: { session: supabaseSession }, error } = await client.auth.getSession();
    
    if (error || !supabaseSession?.user) {
      return null;
    }

    const user: User = {
      id: supabaseSession.user.id,
      email: supabaseSession.user.email ?? '',
      org_id: supabaseSession.user.user_metadata?.org_id,
    };

    return {
      user,
      orgId: user.org_id,
    };
  } catch (error) {
    return null;
  }
}

export async function getSession(): Promise<Session> {
  const client = getSupabaseClient();
  return validateSessionWithClient(client);
}

export async function getSessionFromRequest(request: NextRequest): Promise<Session> {
  const { url, key } = getSupabaseConfig();
  
  // Verify we're using the same config as client
  console.log('[getSessionFromRequest] Config check:', {
    url: url ? `${url.substring(0, 30)}...` : 'missing',
    keyPrefix: key ? `${key.substring(0, 10)}...` : 'missing',
    usingSameEnvVars: true, // Both use NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
  });
  
  // Use createServerClient from @supabase/ssr for proper cookie handling in Next.js middleware
  // This correctly reads Supabase v2 cookies (sb-<project-ref>-auth-token format)
  // Both client and server use NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map(cookie => ({
          name: cookie.name,
          value: cookie.value,
        }));
      },
      setAll(cookiesToSet) {
        // In middleware, we can't set cookies directly via this API
        // The cookies are already set by the client-side Supabase client
        // This is a no-op in middleware context, but required by the API
        // Note: In route handlers, you would use NextResponse to set cookies
      },
    },
  });
  
  console.log('[getSessionFromRequest] Using createServerClient for Supabase v2 cookie handling');
  const cookieNames = request.cookies.getAll().map(c => c.name);
  const supabaseCookies = cookieNames.filter(name => 
    name.includes('supabase') || 
    name.startsWith('sb-') || 
    name.includes('auth')
  );
  console.log('[getSessionFromRequest] Cookie names present:', cookieNames);
  console.log('[getSessionFromRequest] Supabase cookie names:', supabaseCookies);
  
  // Log actual cookie values (first 20 chars only for security)
  supabaseCookies.forEach(name => {
    const cookie = request.cookies.get(name);
    if (cookie) {
      console.log(`[getSessionFromRequest] Cookie ${name}: ${cookie.value.substring(0, 20)}...`);
    }
  });
  
  try {
    const { data: { session: supabaseSession }, error } = await supabase.auth.getSession();
    
    console.log('[getSessionFromRequest] getSession() result:', {
      hasSession: !!supabaseSession,
      hasError: !!error,
      error: error ? { 
        message: error.message, 
        status: error.status,
        name: error.name,
      } : null,
      sessionUser: supabaseSession?.user ? {
        id: supabaseSession.user.id,
        email: supabaseSession.user.email,
      } : null,
    });
    
    if (error) {
      console.error('[getSessionFromRequest] Supabase error details:', {
        message: error.message,
        status: error.status,
        name: error.name,
      });
    }
    
    if (error || !supabaseSession?.user) {
      return null;
    }

    const user: User = {
      id: supabaseSession.user.id,
      email: supabaseSession.user.email ?? '',
      org_id: supabaseSession.user.user_metadata?.org_id,
    };

    return {
      user,
      orgId: user.org_id,
    };
  } catch (error) {
    console.error('[getSessionFromRequest] Unexpected error:', error);
    return null;
  }
}

export async function requireSession(): Promise<{ user: User; orgId?: string }> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

