import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Plus, FileText } from "lucide-react"
import { getClientById } from "@/lib/db/queries/clients"
import { listOffers } from "@/lib/db/queries/offers"
import { getCurrentOrgId } from "@/lib/auth/session"
import { ClientInfoCard } from "@/components/clients/ClientInfoCard"
import { ClientOffersTable } from "@/components/clients/ClientOffersTable"
import { ClientActivityTimeline } from "@/components/clients/ClientActivityTimeline"

export const dynamic = "force-dynamic"

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (id === "nouveau") {
    return null
  }

  const orgId = await getCurrentOrgId()

  let client
  try {
    client = await getClientById(id, orgId)
  } catch (error) {
    notFound()
  }

  const allOffers = await listOffers(orgId)
  const clientOffers = allOffers.filter((o) => o.client_id === id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Link href="/clients">
          <Button variant="ghost" size="icon" aria-label="Retour aux clients">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">
            {client.company || client.name}
          </h1>
          <p className="text-muted-foreground mt-2">
            {client.tags.length > 0 ? client.tags.join(", ") : "Aucun secteur"}
          </p>
        </div>
        <Link href={`/create-offre?client=${client.id}`}>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Créer une offre
          </Button>
        </Link>
      </div>

      {/* Layout 2 colonnes */}
      <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
        {/* Colonne gauche - Sticky */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <ClientInfoCard client={client} />
        </div>

        {/* Colonne droite - Tabs */}
        <div className="space-y-6">
          <Tabs defaultValue="offres" className="w-full">
            <TabsList>
              <TabsTrigger value="offres">
                Offres ({clientOffers.length})
              </TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="activite">Activité</TabsTrigger>
            </TabsList>

            <TabsContent value="offres" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Offres commerciales</h2>
                  <Link href={`/create-offre?client=${client.id}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Nouvelle offre
                    </Button>
                  </Link>
                </div>
                <ClientOffersTable offers={clientOffers} />
              </div>
            </TabsContent>

            <TabsContent value="notes" className="mt-6">
              <div className="rounded-lg border p-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Notes non disponibles
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    La fonctionnalité de notes sera disponible prochainement
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activite" className="mt-6">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Historique d'activité</h2>
                <ClientActivityTimeline offers={clientOffers} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
