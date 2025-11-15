import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
// TODO: supprimer cette route legacy une fois le front migré vers /api/offers
// Cette route est un proxy vers /api/offers pour maintenir la compatibilité avec le frontend existant
import { GET as getOffers, POST as postOffer } from "../offers/route";
import { limitRequest } from "@/lib/api/ratelimit";

/**
 * Helper pour vérifier le rate limiting et retourner 429 si nécessaire
 */
async function checkRateLimit(request: Request | NextRequest): Promise<NextResponse | null> {
  const rateLimitResult = await limitRequest(request, 'offers');
  if (!rateLimitResult.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }
  return null;
}

/**
 * GET /api/offres (legacy)
 * 
 * Proxy vers GET /api/offers pour maintenir la compatibilité.
 * TODO: supprimer cette route une fois le front migré vers /api/offers
 */
export async function GET(request: NextRequest) {
  const rateLimitError = await checkRateLimit(request);
  if (rateLimitError) return rateLimitError;
  
  return getOffers(request);
}

/**
 * POST /api/offres (legacy)
 * 
 * Proxy vers POST /api/offers pour maintenir la compatibilité.
 * TODO: supprimer cette route une fois le front migré vers /api/offers
 */
export async function POST(request: Request) {
  const rateLimitError = await checkRateLimit(request);
  if (rateLimitError) return rateLimitError;
  
  return postOffer(request);
}
