import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../index';
import { admin_allowed_emails } from '../schema';
import { firstOrError, normalizeString } from '../utils';

export interface AdminAllowedEmail {
  id: string;
  email: string;
  created_at: string;
  created_by: string;
  used_at: string | null;
}

/**
 * Liste les emails autorisés pour obtenir le rôle ADMIN, filtrés par orgId.
 * TOUJOURS filtré par orgId pour la sécurité multi-tenant.
 */
export async function listAdminAllowedEmails(orgId: string): Promise<AdminAllowedEmail[]> {
  if (!orgId) throw new Error('orgId is required');
  
  const results = await db
    .select({
      id: admin_allowed_emails.id,
      email: admin_allowed_emails.email,
      created_at: admin_allowed_emails.created_at,
      created_by: admin_allowed_emails.created_by,
      used_at: admin_allowed_emails.used_at,
    })
    .from(admin_allowed_emails)
    .where(eq(admin_allowed_emails.org_id, orgId))
    .orderBy(desc(admin_allowed_emails.created_at));
  
  return results.map((row) => ({
    id: row.id,
    email: normalizeString(row.email),
    created_at: row.created_at.toISOString(),
    created_by: normalizeString(row.created_by),
    used_at: row.used_at ? row.used_at.toISOString() : null,
  }));
}

/**
 * Ajoute un email autorisé pour obtenir le rôle ADMIN.
 * 
 * @param orgId - ID de l'organisation
 * @param email - Email à autoriser (sera normalisé : trim + toLowerCase)
 * @param createdBy - ID de l'admin qui ajoute l'email
 * @returns L'entrée créée
 * @throws Error si orgId ou email est vide, ou si l'email existe déjà pour cette organisation
 */
export async function addAdminAllowedEmail(
  orgId: string,
  email: string,
  createdBy: string
): Promise<AdminAllowedEmail> {
  if (!orgId) throw new Error('orgId is required');
  if (!email || !email.trim()) throw new Error('email is required');
  
  // Normalisation de l'email
  const normalizedEmail = email.trim().toLowerCase();
  
  try {
    const result = await db
      .insert(admin_allowed_emails)
      .values({
        org_id: orgId,
        email: normalizedEmail,
        created_by: createdBy,
      })
      .returning();
    
    const row = firstOrError(result[0], 'Failed to create admin allowed email');
    
    return {
      id: row.id,
      email: normalizeString(row.email),
      created_at: row.created_at.toISOString(),
      created_by: normalizeString(row.created_by),
      used_at: row.used_at ? row.used_at.toISOString() : null,
    };
  } catch (error) {
    // Gérer les erreurs de contrainte unique sur (org_id, email)
    if (error instanceof Error && (
      error.message.includes('unique') || 
      error.message.includes('duplicate') ||
      error.message.includes('violates unique constraint')
    )) {
      throw new Error(`L'email "${normalizedEmail}" est déjà autorisé pour cette organisation`);
    }
    throw error;
  }
}

/**
 * Supprime un email autorisé.
 * 
 * @param orgId - ID de l'organisation
 * @param id - ID de l'entrée à supprimer
 * @throws Error si l'entrée n'existe pas ou n'appartient pas à l'organisation
 */
export async function deleteAdminAllowedEmail(orgId: string, id: string): Promise<void> {
  if (!orgId) throw new Error('orgId is required');
  if (!id) throw new Error('id is required');
  
  const result = await db
    .delete(admin_allowed_emails)
    .where(and(
      eq(admin_allowed_emails.id, id),
      eq(admin_allowed_emails.org_id, orgId)
    ))
    .returning();
  
  if (result.length === 0) {
    throw new Error(`Admin allowed email not found: ${id}`);
  }
}

/**
 * Marque un email comme utilisé (met à jour used_at).
 * 
 * @param orgId - ID de l'organisation
 * @param email - Email à marquer comme utilisé (sera normalisé : trim + toLowerCase)
 * @returns true si l'entrée a été mise à jour, false si elle n'existe pas
 * 
 * @remarks
 * Cette fonction est idempotente : elle ne throw pas si l'entrée n'existe pas.
 */
export async function markAdminEmailAsUsed(orgId: string, email: string): Promise<boolean> {
  if (!orgId) throw new Error('orgId is required');
  if (!email || !email.trim()) throw new Error('email is required');
  
  // Normalisation de l'email
  const normalizedEmail = email.trim().toLowerCase();
  
  const result = await db
    .update(admin_allowed_emails)
    .set({
      used_at: sql`NOW()`,
    })
    .where(and(
      eq(admin_allowed_emails.org_id, orgId),
      eq(admin_allowed_emails.email, normalizedEmail)
    ))
    .returning();
  
  return result.length > 0;
}

