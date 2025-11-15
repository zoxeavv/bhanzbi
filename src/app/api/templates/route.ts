import { NextResponse } from "next/server";
import { getCurrentOrgId } from "@/lib/auth/session";
import { getSession } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/auth/permissions";
import { listTemplates, createTemplate } from "@/lib/db/queries/templates";
import { getLastUsedAtByTemplateIds } from "@/lib/db/queries/offers";
import { createTemplateSchema } from "@/lib/validations";
import { z } from "zod";

/**
 * Log un appel à une route API LEGACY pour monitoring
 */
function logLegacyApiCall(method: string, path: string, orgId: string, userId?: string) {
  const timestamp = new Date().toISOString();
  console.warn('[LEGACY API] Templates API called', {
    method,
    path,
    orgId,
    userId: userId || 'unknown',
    timestamp,
    message: 'This LEGACY route is deprecated and should not be used for new features. Monitor usage and plan removal if unused.',
  });
}

// GET /api/templates - UTILISÉ
// Utilisé par :
// - src/components/offres/CreateOfferStepper.tsx (ligne 77)
// - src/app/(dashboard)/offres/page.tsx (ligne 42)
// Cette route reste active pour les composants clients qui ont besoin de charger la liste des templates.
export async function GET() {
  try {
    const orgId = await getCurrentOrgId();
    const templates = await listTemplates(orgId);
    
    // Récupérer les IDs des templates
    const templateIds = templates.map((t) => t.id);
    
    // Calculer lastUsedAt avec une requête SQL optimisée (GROUP BY + MAX)
    const lastUsedMap = await getLastUsedAtByTemplateIds(orgId, templateIds);
    
    // Enrichir les templates avec lastUsedAt
    const enrichedTemplates = templates.map((template) => ({
      ...template,
      lastUsedAt: lastUsedMap[template.id] || null,
    }));
    
    return NextResponse.json(enrichedTemplates);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('[GET /api/templates] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// LEGACY: POST /api/templates - Plus utilisé par le frontend
// 
// Cette route est maintenue temporairement pour compatibilité avec d'éventuelles intégrations externes.
// La création de templates se fait maintenant via Server Action `createTemplateFromParsedDocx()`.
// 
// TODO: Si aucun appel détecté en 4-6 semaines (via logs/monitoring), planifier la suppression définitive.
// 
// Monitoring: Tous les appels sont loggés avec console.warn pour tracking.
// 
// SÉCURITÉ: Legacy route, only kept for backward compatibility, admin-only.
export async function POST(request: Request) {
  try {
    // Vérifier les permissions admin AVANT tout accès aux données
    await requireAdmin();
    
    const session = await getSession();
    const orgId = await getCurrentOrgId();
    
    // Log l'appel à cette route LEGACY pour monitoring
    logLegacyApiCall('POST', '/api/templates', orgId, session?.user?.id);
    const body = await request.json();
    const validatedData = createTemplateSchema.parse(body);

    const template = await createTemplate({
      orgId,
      title: validatedData.title,
      slug: validatedData.slug,
      content: validatedData.content,
      category: validatedData.category,
      tags: validatedData.tags,
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    // Gérer les erreurs d'authentification/autorisation (requireAdmin, requireSession, getCurrentOrgId)
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'User role not defined' || error.message.includes('Organization ID'))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[POST /api/templates] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
