import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Mail, Phone, Building2, Calendar, FileCheck } from "lucide-react"
import { dataStore } from "@/lib/data-store"

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (id === "nouveau") {
    return null
  }

  const client = await dataStore.getClient(id)

  if (!client) {
    notFound()
  }

  const offres = await dataStore.getOffres()
  const clientOffres = offres.filter((o) => o.client_id === id)

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
          <h1 className="text-3xl font-bold text-foreground">{client.company_name}</h1>
          <p className="text-muted-foreground mt-2">{client.secteur}</p>
        </div>
        <Link href={`/create-offre?client=${client.id}`} className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">Créer une offre</Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Client Info */}
        <Card className="p-6 lg:col-span-1">
          <h2 className="text-lg font-semibold text-foreground mb-4">Informations</h2>
          <div className="space-y-4" role="list">
            <div className="flex items-start gap-3" role="listitem">
              <Building2 className="h-5 w-5 text-primary mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-foreground">Entreprise</p>
                <p className="text-sm text-muted-foreground">{client.company_name}</p>
              </div>
            </div>
            <div className="flex items-start gap-3" role="listitem">
              <Mail className="h-5 w-5 text-primary mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-foreground">Email</p>
                <a
                  href={`mailto:${client.email}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {client.email}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3" role="listitem">
              <Phone className="h-5 w-5 text-primary mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-foreground">Téléphone</p>
                <a
                  href={`tel:${client.phone}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {client.phone}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3" role="listitem">
              <Calendar className="h-5 w-5 text-primary mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-foreground">Client depuis</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(client.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Offres */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-foreground mb-4">Offres ({clientOffres.length})</h2>
          <div className="space-y-3" role="list" aria-label="Liste des offres">
            {clientOffres.length === 0 ? (
              <div className="text-center py-8">
                <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">Aucune offre pour ce client</p>
              </div>
            ) : (
              clientOffres.map((offre) => (
                <Link key={offre.id} href={`/offres/${offre.id}`} role="listitem">
                  <div className="flex items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Offre #{offre.id} - {offre.data.poste || "Sans titre"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(offre.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={offre.status === "validated" ? "default" : "secondary"}
                      className={offre.status === "validated" ? "bg-primary" : ""}
                    >
                      {offre.status === "draft"
                        ? "Brouillon"
                        : offre.status === "validated"
                          ? "Validée"
                          : "Téléchargée"}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
