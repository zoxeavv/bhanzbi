/**
 * Configuration de l'organisation par défaut
 * 
 * CONTEXTE MULTI-TENANT / MONO-TENANT :
 * 
 * Le système est architecturé en multi-tenant strict avec org_id et getCurrentOrgId().
 * Cependant, en pratique produit actuelle, on n'a qu'une seule organisation et qu'un rôle ADMIN.
 * 
 * Ce fichier permet de configurer une organisation par défaut qui sera utilisée
 * comme fallback si jamais la logique d'org de l'utilisateur n'est pas encore en place,
 * ou pour simplifier le fonctionnement en mode mono-tenant.
 * 
 * IMPORTANT :
 * - En production mono-tenant, cette valeur peut être définie dans les variables d'environnement
 * - getCurrentOrgId() reste la source de vérité principale
 * - Ce DEFAULT_ORG_ID n'est utilisé qu'en fallback si nécessaire
 */

/**
 * ID de l'organisation par défaut
 * 
 * Peut être défini via la variable d'environnement DEFAULT_ORG_ID.
 * Si non défini, retourne undefined (pas de fallback automatique).
 * 
 * @example
 * // Dans .env.local ou .env.production
 * DEFAULT_ORG_ID=org-default-prod
 */
export const DEFAULT_ORG_ID: string | undefined = process.env.DEFAULT_ORG_ID;

/**
 * Récupère le DEFAULT_ORG_ID en garantissant qu'il est défini.
 * 
 * Utilisé lors de l'inscription pour garantir qu'un orgId valide est toujours disponible.
 * 
 * @throws Error si DEFAULT_ORG_ID n'est pas configuré
 * @returns Le DEFAULT_ORG_ID (jamais undefined)
 * 
 * @example
 * const orgId = getRequiredDefaultOrgId(); // throw si non défini
 */
export function getRequiredDefaultOrgId(): string {
  if (!DEFAULT_ORG_ID) {
    throw new Error('DEFAULT_ORG_ID is not configured. Please set DEFAULT_ORG_ID environment variable.');
  }
  return DEFAULT_ORG_ID;
}

