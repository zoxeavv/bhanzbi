import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/empty-state";
import { FileText, Mail, Phone, Building2, MapPin, CheckCircle2, Calendar } from "lucide-react";
import { getClientById } from "@/lib/db/queries/clients";
import { listOffersByClient } from "@/lib/db/queries/offers";
import { getCurrentOrgId } from "@/lib/auth/session";
import { ClientOffersTable } from "@/components/clients/ClientOffersTable";
import { formatDate } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/currency";
import type { Client } from "@/types/domain";
import type { Offer } from "@/types/domain";

export const dynamic = "force-dynamic";

// Type étendu pour gérer les champs optionnels (address, city, country, notes)
// TODO: Ces champs ne sont pas encore dans le schéma DB, à ajouter lors d'une future migration
type ClientWithExtendedFields = Client & {
  address?: string;
  city?: string;
  zip?: string;
  country?: string;
  notes?: string;
};

/**
 * Page détail client - Fiche CRM light
 * 
 * Affiche les informations du client et ses offres associées.
 */
export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id === "nouveau") {
    return null;
  }

  try {
    const orgId = await getCurrentOrgId();

    // Récupérer le client
    let client: Client;
    try {
      client = await getClientById(id, orgId);
    } catch (error) {
      // Choix de sécurité : On utilise notFound() pour TOUTES les erreurs
      // (client inexistant OU client d'une autre org) pour éviter les leaks d'information.
      notFound();
    }

    // Récupérer les offres associées
    const clientOffers = await listOffersByClient(id, orgId);

    // Calculer les statistiques
    const totalOffers = clientOffers.length;
    const acceptedOffers = clientOffers.filter((o) => o.status === 'accepted').length;
    const lastOfferDate = clientOffers.length > 0 
      ? clientOffers[0].created_at // Déjà trié par desc(created_at)
      : null;

    // Type étendu pour accéder aux champs optionnels
    const clientExtended = client as ClientWithExtendedFields;

    // Construire la description du PageHeader
    const descriptionParts: string[] = [];
    if (clientExtended.company) descriptionParts.push(clientExtended.company);
    if (clientExtended.city) descriptionParts.push(clientExtended.city);
    if (clientExtended.country) descriptionParts.push(clientExtended.country);
    const description = descriptionParts.length > 0 
      ? descriptionParts.join(' • ')
      : client.tags.length > 0 
        ? client.tags.join(', ')
        : 'Aucune information';

    return (
      <div className="space-y-6">
        {/* PageHeader */}
        <PageHeader
          title={client.name || client.company || 'Client'}
          description={description}
          actions={
            <Button asChild>
              <Link href={`/create-offre?clientId=${client.id}`}>
                Nouvelle offre
          </Link>
            </Button>
          }
        />

        {/* Contenu */}
        <div className="space-y-6 mt-6">
        {/* Layout 2 colonnes */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Colonne gauche */}
            <div className="space-y-6">
              {/* Card Infos client */}
              <Card>
                <CardHeader>
                  <CardTitle>Infos client</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {clientExtended.company && (
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Société</p>
                        <p className="text-sm text-muted-foreground">{clientExtended.company}</p>
                      </div>
          </div>
                  )}
                  
                  {client.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Email</p>
                        <a
                          href={`mailto:${client.email}`}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          {client.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {client.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Téléphone</p>
                        <a
                          href={`tel:${client.phone}`}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          {client.phone}
                        </a>
                  </div>
                </div>
                  )}

                  {(clientExtended.address || clientExtended.city || clientExtended.zip || clientExtended.country) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Adresse</p>
                        <p className="text-sm text-muted-foreground">
                          {[
                            clientExtended.address,
                            clientExtended.zip,
                            clientExtended.city,
                            clientExtended.country,
                          ]
                            .filter(Boolean)
                            .join(', ') || '-'}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card Notes */}
              {clientExtended.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {clientExtended.notes}
                    </p>
                  </CardContent>
                </Card>
              )}
                  </div>

            {/* Colonne droite */}
            <div className="space-y-6">
              {/* StatCards */}
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                <StatCard
                  title="Nombre d'offres"
                  value={totalOffers}
                  icon={<FileText className="h-5 w-5" />}
                />
                <StatCard
                  title="Offres acceptées"
                  value={acceptedOffers}
                  icon={<CheckCircle2 className="h-5 w-5" />}
                />
                {lastOfferDate && (
                  <StatCard
                    title="Dernière offre"
                    value={formatDate(lastOfferDate)}
                    icon={<Calendar className="h-5 w-5" />}
                  />
                )}
                </div>

              {/* Table Offres récentes */}
              {clientOffers.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Aucune offre"
                  description="Aucune offre n'a encore été créée pour ce client."
                  actionLabel="Créer une offre"
                  actionHref={`/create-offre?clientId=${client.id}`}
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Offres récentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ClientOffersTable offers={clientOffers} />
                  </CardContent>
                </Card>
              )}
                </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    // En cas d'erreur (ex: non authentifié), rediriger vers la page de connexion
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      console.error('[ClientDetailPage] Unauthorized:', error);
      redirect('/authentication/login?error=unauthorized');
    }
    
    // Pour les autres erreurs, rediriger vers la liste des clients avec message d'erreur
    console.error('[ClientDetailPage] Error:', error);
    redirect('/clients?error=client_load_failed');
  }
}
