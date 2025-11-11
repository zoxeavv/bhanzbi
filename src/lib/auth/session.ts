import { createClient } from '@supabase/supabase-js';
import type { Session, User } from '@/types/domain';

function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getSession(): Promise<Session> {
  try {
    const { data: { session: supabaseSession }, error } = await supabase.auth.getSession();
    
    if (error || !supabaseSession?.user) {
      return null;
    }

    const user: User = {
      id: supabaseSession.user.id,
      email: supabaseSession.user.email ?? '',
      orgId: supabaseSession.user.user_metadata?.org_id,
    };

    return {
      user,
      orgId: user.orgId,
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

