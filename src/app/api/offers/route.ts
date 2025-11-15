import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentOrgId, requireSession } from "@/lib/auth/session";
import { listOffers, createOffer } from "@/lib/db/queries/offers";
import { createOfferSchema } from "@/lib/validations";
import { z } from "zod";
import { limitRequest } from "@/lib/api/ratelimit";

/**
 * GET /api/offers
 * 
 * Liste les offres pour l'organisation courante.
 * 
 * SÉCURITÉ :
 * - orgId vient TOUJOURS de getCurrentOrgId(), jamais du client
 * - Toutes les queries sont filtrées par org_id
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = await limitRequest(request, 'offers');
  if (!rateLimitResult.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  try {
    const orgId = await getCurrentOrgId();
    const offers = await listOffers(orgId);
    return NextResponse.json(offers);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('[GET /api/offers] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/offers
 * 
 * Crée une nouvelle offre.
 * 
 * SÉCURITÉ :
 * - orgId vient TOUJOURS de getCurrentOrgId(), jamais du body
 * - Le body est validé avec Zod mais ne doit JAMAIS contenir org_id
 */
export async function POST(request: Request) {
  // Rate limiting
  const rateLimitResult = await limitRequest(request, 'offers');
  if (!rateLimitResult.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  try {
    await requireSession();
    const orgId = await getCurrentOrgId();
    const body = await request.json();
    
    // SÉCURITÉ : Vérifier explicitement qu'org_id n'est pas dans le body
    if ('org_id' in body || 'orgId' in body) {
      return NextResponse.json(
        { error: 'Le champ org_id ne peut pas être fourni dans la requête' },
        { status: 400 }
      );
    }
    
    // Valider le body avec Zod
    const validatedData = createOfferSchema.parse(body);

    const offer = await createOffer({
      orgId,
      client_id: validatedData.client_id,
      template_id: validatedData.template_id ?? null,
      title: validatedData.title,
      items: validatedData.items,
      subtotal: validatedData.subtotal,
      tax_rate: validatedData.tax_rate,
      tax_amount: validatedData.tax_amount,
      total: validatedData.total,
      status: validatedData.status,
    });

    return NextResponse.json(offer, { status: 201 });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (error instanceof z.ZodError) {
      // En production : ne pas exposer les détails de validation
      // En développement : inclure les détails pour faciliter le debug
      const response: { error: string; details?: Array<{ path: string; message: string }> } = {
        error: 'Données invalides',
      };
      
      if (process.env.NODE_ENV !== 'production') {
        response.details = error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        }));
      }
      
      return NextResponse.json(response, { status: 400 });
    }

    console.error('[POST /api/offers] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la création de l\'offre' },
      { status: 500 }
    );
  }
}

