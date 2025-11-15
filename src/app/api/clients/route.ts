import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentOrgId, requireSession } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/auth/permissions";
import { listClients, createClient } from "@/lib/db/queries/clients";
import { createClientSchema } from "@/lib/validations";
import { z } from "zod";
import { limitRequest } from "@/lib/api/ratelimit";

/**
 * Helper pour vérifier le rate limiting et retourner 429 si nécessaire
 */
async function checkRateLimit(request: Request | NextRequest): Promise<NextResponse | null> {
  const rateLimitResult = await limitRequest(request, 'clients');
  if (!rateLimitResult.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }
  return null;
}

/**
 * GET /api/clients
 * 
 * Liste les clients avec pagination et recherche textuelle.
 * Accessible aux utilisateurs authentifiés (requireSession), filtré par orgId.
 * 
 * Query params:
 * - search: recherche textuelle sur name, company, email (ILIKE)
 * - page: numéro de page (défaut: 1)
 * - limit: nombre d'éléments par page (défaut: 20, max: 100)
 * 
 * SÉCURITÉ :
 * - orgId vient TOUJOURS de getCurrentOrgId(), jamais du client
 * - Toutes les queries sont filtrées par org_id
 */
export async function GET(request: NextRequest) {
  const rateLimitError = await checkRateLimit(request);
  if (rateLimitError) return rateLimitError;

  try {
    // Vérifier l'authentification (requireSession pour GET)
    await requireSession();
    const orgId = await getCurrentOrgId();
    
    // Extraire les query params (NE JAMAIS accepter orgId depuis le client)
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') ?? undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
    
    // Valider les paramètres de pagination
    if (page !== undefined && (isNaN(page) || page < 1)) {
      return NextResponse.json(
        { error: 'Le paramètre page doit être un nombre entier positif' },
        { status: 400 }
      );
    }
    if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 100)) {
      return NextResponse.json(
        { error: 'Le paramètre limit doit être un nombre entre 1 et 100' },
        { status: 400 }
      );
    }
    
    // Appeler la fonction de query avec pagination
    const result = await listClients(orgId, {
      search,
      page,
      limit,
    });
    
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }
    console.error('[GET /api/clients] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des clients' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clients
 * 
 * Crée un nouveau client.
 * 
 * SÉCURITÉ :
 * - Protégé par requireAdmin() (seuls les admins peuvent créer)
 * - orgId vient TOUJOURS de getCurrentOrgId(), jamais du body
 * - Le body est validé avec Zod mais ne doit JAMAIS contenir org_id
 */
export async function POST(request: Request) {
  const rateLimitError = await checkRateLimit(request);
  if (rateLimitError) return rateLimitError;

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
    
    // Valider le body avec Zod
    const validatedData = createClientSchema.parse(body);

    // Créer le client (orgId vient de getCurrentOrgId(), pas du body)
    const client = await createClient({
      orgId,
      name: validatedData.name,
      company: validatedData.company ?? '',
      email: validatedData.email ?? '',
      phone: validatedData.phone ?? '',
      tags: validatedData.tags,
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json(
        { error: 'Non autorisé' },
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

    console.error('[POST /api/clients] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la création du client' },
      { status: 500 }
    );
  }
}
