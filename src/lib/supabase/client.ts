import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Extract project ref from URL for logging (without exposing full URL/key)
const urlObj = new URL(supabaseUrl);
const projectRef = urlObj.hostname.split('.')[0]; // e.g., "bofkyolkmaxouwjzlnwa" from "bofkyolkmaxouwjzlnwa.supabase.co"
const keyPrefix = supabaseAnonKey.substring(0, 10); // First 10 chars only for identification

console.log('[Supabase Client] Initializing Supabase browser client with createBrowserClient:', {
  hostname: urlObj.hostname,
  projectRef: projectRef,
  keyPrefix: `${keyPrefix}...`,
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
});

/**
 * Browser-side Supabase client using createBrowserClient from @supabase/ssr.
 * This ensures proper cookie handling compatible with createServerClient in middleware.
 * The client automatically manages cookies (sb-<project-ref>-auth-token) for session persistence.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

