import { NextResponse } from "next/server";
import { getCurrentOrgId, requireSession } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/auth/permissions";
import { getClientById, updateClient, deleteClient } from "@/lib/db/queries/clients";
import { createClientSchema } from "@/lib/validations";
import { z } from "zod";

/**
 * GET /api/clients/[id]
 * 
 * Récupère un client par son ID.
 * 
 * SÉCURITÉ :
 * - Accessible aux utilisateurs authentifiés (requireSession)
 * - Filtré par orgId (getCurrentOrgId())
 * - Retourne 404 si le client n'existe pas ou appartient à une autre org (pas de leak d'info)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification
    await requireSession();
    const orgId = await getCurrentOrgId();
    const { id } = await params;
    
    // SÉCURITÉ : Vérifier que l'ID ne contient pas de caractères dangereux
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { error: 'ID de client invalide' },
        { status: 400 }
      );
    }
    
    const client = await getClientById(id, orgId);
    return NextResponse.json(client);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Client introuvable' },
        { status: 404 }
      );
    }
    console.error('[GET /api/clients/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération du client' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/clients/[id]
 * 
 * Met à jour partiellement un client.
 * 
 * SÉCURITÉ :
 * - Protégé par requireAdmin() (seuls les admins peuvent modifier)
 * - orgId vient TOUJOURS de getCurrentOrgId(), jamais du body
 * - Vérifie l'existence du client pour orgId avant mise à jour
 * - Le body ne doit JAMAIS contenir org_id
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier les permissions admin
    await requireAdmin();
    const orgId = await getCurrentOrgId();
    const { id } = await params;
    
    // SÉCURITÉ : Vérifier que l'ID est valide
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { error: 'ID de client invalide' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    // SÉCURITÉ : Vérifier explicitement qu'org_id n'est pas dans le body
    if ('org_id' in body || 'orgId' in body) {
      return NextResponse.json(
        { error: 'Le champ org_id ne peut pas être fourni dans la requête' },
        { status: 400 }
      );
    }
    
    // Valider le body avec Zod (partial pour PATCH)
    const validatedData = createClientSchema.partial().parse(body);
    
    // Vérifier l'existence du client avant mise à jour (getClientById throw si non trouvé)
    await getClientById(id, orgId);
    
    // Mettre à jour le client
    const client = await updateClient(id, orgId, {
      name: validatedData.name,
      company: validatedData.company,
      email: validatedData.email,
      phone: validatedData.phone,
      tags: validatedData.tags,
    });
    
    return NextResponse.json(client);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })) },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Client introuvable' },
        { status: 404 }
      );
    }
    console.error('[PATCH /api/clients/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la mise à jour du client' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/clients/[id]
 * 
 * Supprime un client (hard delete pour l'instant).
 * 
 * SÉCURITÉ :
 * - Protégé par requireAdmin() (seuls les admins peuvent supprimer)
 * - Filtré par orgId (getCurrentOrgId())
 * - Retourne 404 si le client n'existe pas ou appartient à une autre org
 * 
 * NOTE : Pour l'instant, implémente un hard delete.
 * Si un champ is_archived ou deleted_at est ajouté au schéma, implémenter un soft delete.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier les permissions admin
    await requireAdmin();
    const orgId = await getCurrentOrgId();
    const { id } = await params;
    
    // SÉCURITÉ : Vérifier que l'ID est valide
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { error: 'ID de client invalide' },
        { status: 400 }
      );
    }
    
    // Vérifier l'existence du client avant suppression (getClientById throw si non trouvé)
    await getClientById(id, orgId);
    
    // TODO: Si un champ is_archived ou deleted_at est ajouté au schéma clients,
    // implémenter un soft delete au lieu d'un hard delete :
    // await db.update(clients)
    //   .set({ is_archived: true, deleted_at: new Date() })
    //   .where(and(eq(clients.id, id), eq(clients.org_id, orgId)));
    
    // Hard delete pour l'instant
    await deleteClient(id, orgId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Client introuvable' },
        { status: 404 }
      );
    }
    console.error('[DELETE /api/clients/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la suppression du client' },
      { status: 500 }
    );
  }
}
