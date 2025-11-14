import { createServerClient } from '@supabase/ssr';
import type { Session, User } from '@/types/domain';
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';


function getSupabaseConfig() {
  // Lazy evaluation for Edge Runtime compatibility
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  return { url, key };
}

/**
 * Get the authenticated user using getUser() for proper JWT validation.
 * This ensures the JWT is valid and not expired, unlike getSession().
 * Returns null if user is not authenticated or JWT is invalid.
 */
async function getAuthenticatedUser(): Promise<{ id: string; email: string; org_id?: string } | null> {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? '',
      org_id: user.user_metadata?.org_id,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Get the authenticated user from a NextRequest (for middleware).
 * Uses getUser() for proper JWT validation.
 */
async function getAuthenticatedUserFromRequest(request: NextRequest): Promise<{ id: string; email: string; org_id?: string } | null> {
  try {
    const { url, key } = getSupabaseConfig();
    
    // Extract project ref from URL to filter cookies
    const urlObj = new URL(url);
    const projectRef = urlObj.hostname.split('.')[0];
    
    // Filter cookies to only include ones matching the current project
    const allCookies = request.cookies.getAll();
    const filteredCookies = allCookies.filter(cookie => {
      if (cookie.name.startsWith(`sb-${projectRef}-`)) {
        return true;
      }
      if (cookie.name.startsWith('sb-') && !cookie.name.startsWith(`sb-${projectRef}-`)) {
        return false;
      }
      return true;
    });
    
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return filteredCookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
        setAll() {
          // No-op in middleware context
        },
      },
    });
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? '',
      org_id: user.user_metadata?.org_id,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Get the current session for Server Components and API routes.
 * Uses getUser() for proper authentication validation.
 * Returns null if user is not authenticated.
 */
export async function getSession(): Promise<Session> {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return null;
    }

    const sessionUser: User = {
      id: user.id,
      email: user.email,
      org_id: user.org_id,
    };

    return {
      user: sessionUser,
      orgId: user.org_id,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Get the current session from a NextRequest (for middleware).
 * Uses getUser() for proper JWT validation instead of getSession().
 * Returns null if user is not authenticated or JWT is invalid.
 */
export async function getSessionFromRequest(request: NextRequest): Promise<Session> {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    
    if (!user) {
      return null;
    }

    const sessionUser: User = {
      id: user.id,
      email: user.email,
      org_id: user.org_id,
    };

    return {
      user: sessionUser,
      orgId: user.org_id,
    };
  } catch (error) {
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

/**
 * Get the current organization ID from the session.
 * Throws if no session or org_id is missing.
 */
export async function getCurrentOrgId(): Promise<string> {
  const session = await requireSession();
  if (!session.orgId) {
    throw new Error('Organization ID not found in session');
  }
  return session.orgId;
}

