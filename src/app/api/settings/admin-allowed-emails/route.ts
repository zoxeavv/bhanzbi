import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentOrgId, requireSession } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/auth/permissions";
import {
  listAdminAllowedEmails,
  addAdminAllowedEmail,
  deleteAdminAllowedEmail,
} from "@/lib/db/queries/adminAllowedEmails";

/**
 * GET /api/settings/admin-allowed-emails
 * 
 * Liste les emails autorisés à obtenir le rôle ADMIN pour l'organisation courante.
 * 
 * SÉCURITÉ :
 * - Protégé par requireAdmin() (seuls les admins peuvent consulter)
 * - orgId vient TOUJOURS de getCurrentOrgId(), jamais du client
 * - Toutes les queries sont filtrées par org_id
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier les permissions admin
    await requireAdmin();
    const orgId = await getCurrentOrgId();
    
    // Récupérer la liste des emails autorisés
    const items = await listAdminAllowedEmails(orgId);
    
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }
    console.error('[GET /api/settings/admin-allowed-emails] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des emails autorisés' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/admin-allowed-emails
 * 
 * Ajoute un email autorisé à obtenir le rôle ADMIN.
 * 
 * SÉCURITÉ :
 * - Protégé par requireAdmin() (seuls les admins peuvent ajouter)
 * - orgId vient TOUJOURS de getCurrentOrgId(), jamais du body
 * - L'email est normalisé (trim + toLowerCase) avant insertion
 * - Le body ne doit JAMAIS contenir org_id
 */
export async function POST(request: Request) {
  try {
    // Vérifier les permissions admin
    await requireAdmin();
    const session = await requireSession();
    const orgId = await getCurrentOrgId();
    
    const body = await request.json();
    
    // SÉCURITÉ : Vérifier explicitement qu'org_id n'est pas dans le body
    if ('org_id' in body || 'orgId' in body) {
      return NextResponse.json(
        { error: 'Le champ org_id ne peut pas être fourni dans la requête' },
        { status: 400 }
      );
    }
    
    // Extraire et valider l'email
    const { email } = body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Le champ email est requis et doit être une chaîne non vide' },
        { status: 400 }
      );
    }
    
    // Normaliser l'email (trim + toLowerCase)
    const normalizedEmail = email.trim().toLowerCase();
    
    // Ajouter l'email autorisé
    await addAdminAllowedEmail(orgId, normalizedEmail, session.user.id);
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }
    
    // Gérer les erreurs de validation (email déjà existant, etc.)
    if (error instanceof Error && (
      error.message.includes('déjà autorisé') ||
      error.message.includes('already') ||
      error.message.includes('duplicate') ||
      error.message.includes('unique')
    )) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    console.error('[POST /api/settings/admin-allowed-emails] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'ajout de l\'email autorisé' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/admin-allowed-emails
 * 
 * Supprime un email autorisé.
 * 
 * SÉCURITÉ :
 * - Protégé par requireAdmin() (seuls les admins peuvent supprimer)
 * - orgId vient TOUJOURS de getCurrentOrgId(), jamais du body
 * - Filtré par orgId pour garantir l'isolation multi-tenant
 * 
 * Body attendu : { id: string }
 */
export async function DELETE(request: Request) {
  try {
    // Vérifier les permissions admin
    await requireAdmin();
    const orgId = await getCurrentOrgId();
    
    const body = await request.json();
    
    // SÉCURITÉ : Vérifier explicitement qu'org_id n'est pas dans le body
    if ('org_id' in body || 'orgId' in body) {
      return NextResponse.json(
        { error: 'Le champ org_id ne peut pas être fourni dans la requête' },
        { status: 400 }
      );
    }
    
    // Extraire et valider l'ID
    const { id } = body;
    if (!id || typeof id !== 'string' || !id.trim()) {
      return NextResponse.json(
        { error: 'Le champ id est requis et doit être une chaîne non vide' },
        { status: 400 }
      );
    }
    
    // Supprimer l'email autorisé
    await deleteAdminAllowedEmail(orgId, id.trim());
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }
    
    // Gérer les erreurs de ressource non trouvée
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Email autorisé introuvable' },
        { status: 404 }
      );
    }
    
    console.error('[DELETE /api/settings/admin-allowed-emails] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la suppression de l\'email autorisé' },
      { status: 500 }
    );
  }
}


