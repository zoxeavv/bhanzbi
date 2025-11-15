import { NextResponse } from "next/server";
import { getCurrentOrgId } from "@/lib/auth/session";
import { getSession } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/auth/permissions";
import { getTemplateById, updateTemplate } from "@/lib/db/queries/templates";
import { createTemplateSchema } from "@/lib/validations";
import { validateTemplateContent } from "@/lib/templates/schema";
import { z } from "zod";

/**
 * Log un appel à une route API LEGACY pour monitoring
 */
function logLegacyApiCall(method: string, path: string, orgId: string, userId?: string, templateId?: string) {
  const timestamp = new Date().toISOString();
  console.warn('[LEGACY API] Templates API called', {
    method,
    path,
    orgId,
    userId: userId || 'unknown',
    templateId,
    timestamp,
    message: 'This LEGACY route is deprecated and should not be used for new features. Monitor usage and plan removal if unused.',
  });
}

// LEGACY: GET /api/templates/[id] - Plus utilisé par le frontend
//
// Cette route est maintenue temporairement pour compatibilité avec d'éventuelles intégrations externes.
// Le chargement d'un template se fait maintenant directement via `getTemplateById()` dans les Server Components.
//
// TODO: Si aucun appel détecté en 4-6 semaines (via logs/monitoring), planifier la suppression définitive.
//
// Monitoring: Tous les appels sont loggés avec console.warn pour tracking.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const orgId = await getCurrentOrgId();
    const { id } = await params;
    
    // Log l'appel à cette route LEGACY pour monitoring
    logLegacyApiCall('GET', `/api/templates/${id}`, orgId, session?.user?.id, id);
    
    const template = await getTemplateById(id, orgId);
    return NextResponse.json(template);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    console.error('[GET /api/templates/[id]] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// LEGACY: PATCH /api/templates/[id] - Plus utilisé par le frontend
//
// Cette route est maintenue temporairement pour compatibilité avec d'éventuelles intégrations externes.
// La mise à jour de templates se fait maintenant via Server Actions :
// - `updateTemplateAction()` pour les mises à jour générales
// - `resetTemplateStructure()` pour réinitialiser la structure
//
// TODO: Si aucun appel détecté en 4-6 semaines (via logs/monitoring), planifier la suppression définitive.
//
// Monitoring: Tous les appels sont loggés avec console.warn pour tracking.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(); // ✅ Protection admin pour modification de templates
    const session = await getSession();
    const orgId = await getCurrentOrgId();
    const { id } = await params;
    
    // Log l'appel à cette route LEGACY pour monitoring
    logLegacyApiCall('PATCH', `/api/templates/${id}`, orgId, session?.user?.id, id);
    const body = await request.json();
    
    // Validation partielle pour permettre les updates partiels
    const validatedData = createTemplateSchema.partial().parse(body);
    
    // Validation stricte du content si présent
    if (body.content !== undefined) {
      const validatedContent = validateTemplateContent(body.content);
      
      if (validatedContent === null) {
        // Log l'erreur en interne pour le debugging
        console.error('[PATCH /api/templates/[id]] Invalid content structure:', {
          templateId: id,
          content: body.content,
        });
        
        // Retourner une erreur générique sans exposer les détails
        return NextResponse.json(
          { error: 'Invalid content structure' },
          { status: 400 }
        );
      }
      
      // Normaliser le contenu validé (réordonner, nettoyer)
      validatedData.content = JSON.stringify(validatedContent);
    }
    
    const template = await updateTemplate(id, orgId, validatedData);
    return NextResponse.json(template);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    console.error('[PATCH /api/templates/[id]] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
