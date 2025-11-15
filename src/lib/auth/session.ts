import { createServerClient } from '@supabase/ssr';
import type { Session, User, Role } from '@/types/domain';
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DEFAULT_ORG_ID } from '@/lib/config/org';


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
async function getAuthenticatedUser(): Promise<{ id: string; email: string; org_id?: string; role?: Role } | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    // IMPORTANT : ne jamais fallback automatiquement à ADMIN, le rôle doit être explicitement défini dans user_metadata.
    // Si user_metadata?.role est défini ET correspond au type Role → l'utiliser, sinon → undefined
    const role = user.user_metadata?.role as Role | undefined;
    // Valider que le rôle est bien un Role valide si défini
    const validRole: Role | undefined = (role === "ADMIN" || role === "USER") ? role : undefined;

    return {
      id: user.id,
      email: user.email ?? '',
      org_id: user.user_metadata?.org_id,
      role: validRole,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Get the authenticated user from a NextRequest (for middleware).
 * Uses getUser() for proper JWT validation.
 */
async function getAuthenticatedUserFromRequest(request: NextRequest): Promise<{ id: string; email: string; org_id?: string; role?: Role } | null> {
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

    // IMPORTANT : ne jamais fallback automatiquement à ADMIN, le rôle doit être explicitement défini dans user_metadata.
    // Si user_metadata?.role est défini ET correspond au type Role → l'utiliser, sinon → undefined
    const role = user.user_metadata?.role as Role | undefined;
    // Valider que le rôle est bien un Role valide si défini
    const validRole: Role | undefined = (role === "ADMIN" || role === "USER") ? role : undefined;

    return {
      id: user.id,
      email: user.email ?? '',
      org_id: user.user_metadata?.org_id,
      role: validRole,
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
      role: user.role,
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
      role: user.role,
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
 * 
 * CONTEXTE MULTI-TENANT / MONO-TENANT :
 * 
 * Le système est architecturé en multi-tenant strict avec org_id et getCurrentOrgId().
 * Cependant, en pratique produit actuelle, on n'a qu'une seule organisation et qu'un rôle ADMIN.
 * 
 * Ce fonctionnement "mono-tenant sur infra multi-tenant" permet de :
 * - Conserver l'architecture multi-tenant pour une évolution future
 * - Simplifier la gestion en production avec une seule organisation
 * - Centraliser la source de vérité de l'orgId dans cette fonction
 * 
 * IMPORTANT :
 * - Cette fonction est la SEULE source de vérité pour l'orgId dans le code de production
 * - Toutes les queries DB multi-tenant doivent utiliser l'orgId fourni par cette fonction
 * - Aucun org_id ne doit être hardcodé ailleurs (sauf dans les tests/seeding)
 * 
 * FALLBACK MONO-TENANT (optionnel) :
 * 
 * Si la session n'a pas d'orgId et que DEFAULT_ORG_ID est défini dans les variables
 * d'environnement, cette fonction utilisera cette valeur par défaut.
 * 
 * Pour activer le mode mono-tenant en production :
 * 1. Définir DEFAULT_ORG_ID dans .env.production ou les variables d'environnement
 * 2. S'assurer que tous les utilisateurs ont le même org_id dans user_metadata
 *    OU laisser cette fonction utiliser le fallback DEFAULT_ORG_ID
 * 
 * @example
 * // En production mono-tenant, dans .env.production :
 * DEFAULT_ORG_ID=org-default-prod
 * 
 * // Tous les appels à getCurrentOrgId() retourneront 'org-default-prod'
 * // si l'utilisateur n'a pas d'org_id dans sa session
 * 
 * @returns L'orgId de la session utilisateur, ou DEFAULT_ORG_ID si défini et session.orgId manquant
 * @throws Error si aucune session ou si orgId manquant ET DEFAULT_ORG_ID non défini
 */
export async function getCurrentOrgId(): Promise<string> {
  const session = await requireSession();
  
  // Si la session a un orgId, l'utiliser (comportement normal multi-tenant)
  if (session.orgId) {
    return session.orgId;
  }
  
  // Fallback optionnel pour mode mono-tenant en production
  // Si DEFAULT_ORG_ID est défini, l'utiliser comme fallback
  if (DEFAULT_ORG_ID) {
    return DEFAULT_ORG_ID;
  }
  
  // Si ni session.orgId ni DEFAULT_ORG_ID, throw une erreur
  throw new Error('Organization ID not found in session and DEFAULT_ORG_ID is not configured');
}

