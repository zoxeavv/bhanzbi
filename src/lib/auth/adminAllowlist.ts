import { listAdminAllowedEmails, markAdminEmailAsUsed } from '@/lib/db/queries/adminAllowedEmails';
import { DEFAULT_ORG_ID } from '@/lib/config/org';

/**
 * Vérifie si un email est autorisé à obtenir le rôle ADMIN pour l'organisation courante.
 * 
 * @param email - Email à vérifier (sera normalisé : trim + toLowerCase)
 * @param orgId - ID de l'organisation (optionnel, utilise DEFAULT_ORG_ID si non fourni)
 * @returns true si l'email est dans la allowlist, false sinon
 */
export async function isEmailAllowedForAdmin(
  email: string,
  orgId?: string
): Promise<boolean> {
  if (!email || !email.trim()) {
    return false;
  }

  // Normaliser l'email
  const normalizedEmail = email.trim().toLowerCase();

  // Utiliser l'orgId fourni ou DEFAULT_ORG_ID
  const targetOrgId = orgId || DEFAULT_ORG_ID;
  
  if (!targetOrgId) {
    console.warn('[isEmailAllowedForAdmin] No orgId provided and DEFAULT_ORG_ID is not configured');
    return false;
  }

  try {
    // Récupérer la liste des emails autorisés pour cette organisation
    const allowedEmails = await listAdminAllowedEmails(targetOrgId);
    
    // Vérifier si l'email normalisé est dans la liste
    // Note: les emails sont stockés en minuscule dans la DB pour éviter les doublons
    return allowedEmails.some(
      (allowedEmail) => allowedEmail.email === normalizedEmail
    );
  } catch (error) {
    console.error('[isEmailAllowedForAdmin] Error checking allowlist:', error);
    // En cas d'erreur, ne pas autoriser par défaut (fail-safe)
    return false;
  }
}

/**
 * Détermine le rôle initial d'un nouvel utilisateur basé sur l'allowlist.
 * 
 * @param email - Email de l'utilisateur (sera normalisé)
 * @param orgId - ID de l'organisation (optionnel, utilise DEFAULT_ORG_ID si non fourni)
 * @returns "ADMIN" si l'email est dans la allowlist, "USER" sinon
 */
export async function assignInitialRoleForNewUser(
  email: string,
  orgId?: string
): Promise<'ADMIN' | 'USER'> {
  const isAllowed = await isEmailAllowedForAdmin(email, orgId);
  return isAllowed ? 'ADMIN' : 'USER';
}

/**
 * Marque un email comme utilisé dans l'allowlist (si c'est un admin).
 * 
 * @param email - Email à marquer comme utilisé (sera normalisé)
 * @param orgId - ID de l'organisation (optionnel, utilise DEFAULT_ORG_ID si non fourni)
 * @returns true si l'email a été marqué comme utilisé, false sinon
 */
export async function markEmailAsUsedIfAdmin(
  email: string,
  orgId?: string
): Promise<boolean> {
  if (!email || !email.trim()) {
    return false;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const targetOrgId = orgId || DEFAULT_ORG_ID;

  if (!targetOrgId) {
    return false;
  }

  try {
    // Vérifier d'abord si l'email est dans la allowlist
    const isAllowed = await isEmailAllowedForAdmin(normalizedEmail, targetOrgId);
    
    if (!isAllowed) {
      return false;
    }

    // Marquer comme utilisé
    return await markAdminEmailAsUsed(targetOrgId, normalizedEmail);
  } catch (error) {
    console.error('[markEmailAsUsedIfAdmin] Error marking email as used:', error);
    return false;
  }
}

