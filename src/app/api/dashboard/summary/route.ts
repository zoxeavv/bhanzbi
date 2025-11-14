import { NextResponse } from "next/server";
import { getCurrentOrgId } from "@/lib/auth/session";
import { countClients } from "@/lib/db/queries/clients";
import { countTemplates } from "@/lib/db/queries/templates";
import { countOffers, getRecentOffers } from "@/lib/db/queries/offers";
import { getClientById } from "@/lib/db/queries/clients";

/**
 * API route pour récupérer les statistiques du dashboard.
 * Retourne les compteurs et les dernières offres pour l'organisation courante.
 * 
 * Sécurité : Utilise getCurrentOrgId() pour garantir l'isolation multi-tenant.
 */
export async function GET() {
  try {
    const orgId = await getCurrentOrgId();
    
    // Récupérer les compteurs en parallèle pour optimiser les performances
    const [clientsCount, templatesCount, offersCount, recentOffers] = await Promise.all([
      countClients(orgId),
      countTemplates(orgId),
      countOffers(orgId),
      getRecentOffers(orgId, 5),
    ]);

    // Garantir que recentOffers est toujours un array
    const safeRecentOffers = recentOffers ?? [];

    // Enrichir les offres récentes avec les informations du client
    const recentOffersWithClient = await Promise.all(
      safeRecentOffers.map(async (offer) => {
        try {
          const client = await getClientById(offer.client_id, orgId);
          return {
            id: offer.id,
            title: offer.title,
            total: offer.total,
            created_at: offer.created_at,
            clientName: client.company || client.name,
            status: offer.status,
          };
        } catch (error) {
          // Si le client n'existe plus, on retourne quand même l'offre avec un nom par défaut
          return {
            id: offer.id,
            title: offer.title,
            total: offer.total,
            created_at: offer.created_at,
            clientName: "Client supprimé",
            status: offer.status,
          };
        }
      })
    );

    return NextResponse.json({
      clientsCount: clientsCount ?? 0,
      templatesCount: templatesCount ?? 0,
      offersCount: offersCount ?? 0,
      recentOffers: recentOffersWithClient,
    });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('[GET /api/dashboard/summary] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


