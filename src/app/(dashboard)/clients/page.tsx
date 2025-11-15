import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ClientsTableSection } from "@/components/clients/ClientsTableSection";
import { Building2 } from "lucide-react";
import type { ClientWithOffersCount } from "@/types/domain";
import { getClientsWithOffersCount } from "@/lib/db/queries/clients";
import { getCurrentOrgId } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Page Server Component pour la liste des clients
 * 
 * Récupère les clients côté serveur avec le nombre d'offres et calcule les statistiques.
 * Passe les données à un composant client pour la gestion de la recherche/filtres.
 * 
 * Note: Utilise directement getClientsWithOffersCount() pour une meilleure performance.
 * L'API /api/clients est disponible pour les appels côté client si nécessaire.
 */
export default async function ClientsPage() {
  try {
    const orgId = await getCurrentOrgId();
    
    // Récupérer les clients avec le nombre d'offres
    // Note: Cette fonction retourne tous les clients (pas de pagination côté serveur)
    // Pour la V1, on récupère tous les clients. La pagination sera gérée côté client si nécessaire.
    const clients: ClientWithOffersCount[] = await getClientsWithOffersCount(orgId);
    
    // Calculer les statistiques côté serveur
    const totalClients = clients.length;
    
    // NOTE: Les StatCards "Prospects" et "Clients actifs" sont masquées tant que le champ status
    // n'existe pas dans le schéma DB. À réactiver lors de l'ajout du champ status.
    
    return (
      <div className="space-y-6">
        {/* PageHeader */}
        <PageHeader
          title="Clients"
          description="Gérez votre portefeuille de clients et suivez vos relations commerciales."
          actions={
            <Button asChild>
              <Link href="/clients/nouveau">Nouveau client</Link>
            </Button>
          }
        />
        
        {/* Stats et Table */}
        <div className="space-y-4 mt-6">
          {/* StatCards */}
          <div className="grid gap-4 md:grid-cols-1">
            <StatCard
              title="Total des clients"
              value={totalClients}
              icon={<Building2 className="h-5 w-5" />}
            />
            {/* TODO: Réactiver ces StatCards lorsque le champ status sera ajouté au schéma DB
            <StatCard
              title="Prospects"
              value={prospectsCount}
              icon={<Users className="h-5 w-5" />}
            />
            <StatCard
              title="Clients actifs"
              value={activeCount}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            */}
          </div>
          
          {/* Composant client pour la table avec recherche/filtres */}
          <ClientsTableSection initialClients={clients} />
        </div>
      </div>
    );
  } catch (error) {
    // En cas d'erreur (ex: non authentifié), rediriger vers la page de connexion
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      console.error('[ClientsPage] Unauthorized:', error);
      redirect('/authentication/login?error=unauthorized');
    }
    
    // Pour les autres erreurs, rediriger vers le dashboard avec message d'erreur
    console.error('[ClientsPage] Error:', error);
    redirect('/dashboard?error=clients_load_failed');
  }
}
