import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Creates a Supabase server client for use in API routes and server components.
 * This client properly handles cookies for session management, compatible with
 * createBrowserClient on the client side and createServerClient in middleware.
 * 
 * Usage in API routes:
 * ```ts
 * import { createSupabaseServerClient } from '@/lib/supabase/server';
 * 
 * export async function GET(request: Request) {
 *   const supabase = createSupabaseServerClient();
 *   const { data: { session } } = await supabase.auth.getSession();
 *   // ...
 * }
 * ```
 */
export function createSupabaseServerClient(): SupabaseClient {
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
          console.warn('[createSupabaseServerClient] Failed to set cookies (likely called from Server Component):', error);
        }
      },
    },
  });
}

