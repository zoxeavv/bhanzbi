"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, FileCheck, Building2, FileText, Calendar } from "lucide-react"
import { dataStore } from "@/lib/data-store"
import { EmptyState } from "@/components/empty-state"
import { toast } from "sonner"
import type { Offre, Client, Template } from "@/lib/types"
import { Input } from "@/components/ui/input"

type OffreWithDetails = Offre & {
  client?: Client
  template?: Template
}

export default function OffresPage() {
  const [offres, setOffres] = useState<OffreWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    async function loadOffres() {
      try {
        const [offresData, clients, templates] = await Promise.all([
          dataStore.getOffres(),
          dataStore.getClients(),
          dataStore.getTemplates(),
        ])

        const offresWithDetails = offresData.map((offre) => ({
          ...offre,
          client: clients.find((c) => c.id === offre.client_id),
          template: templates.find((t) => t.id === offre.template_id),
        }))

        setOffres(offresWithDetails)
      } catch (error) {
        console.error("Error loading offres:", error)
        toast.error("Erreur lors du chargement des offres")
      } finally {
        setLoading(false)
      }
    }
    loadOffres()
  }, [])

  const filteredOffres = offres.filter(
    (offre) =>
      offre.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offre.client?.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offre.data?.poste?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  function getStatusBadge(status: string) {
    const variants: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
      draft: { variant: "secondary", label: "Brouillon" },
      validated: { variant: "default", label: "Validée" },
      downloaded: { variant: "outline", label: "Téléchargée" },
    }
    const config = variants[status] || variants.draft
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Offres commerciales</h1>
          <p className="text-muted-foreground mt-2">Gérez vos offres et propositions</p>
        </div>
        <Link href="/create-offre">
          <Button className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Nouvelle offre
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : offres.length === 0 ? (
        <EmptyState
          icon={FileCheck}
          title="Aucune offre"
          description="Créez votre première offre commerciale pour vos clients."
          actionLabel="Créer une offre"
          actionHref="/create-offre"
        />
      ) : (
        <>
          <div className="max-w-md">
            <Input
              placeholder="Rechercher une offre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOffres.map((offre) => (
              <Link key={offre.id} href={`/offres/${offre.id}`}>
                <Card className="h-full hover:border-primary transition-all hover:shadow-lg cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                            #{offre.id}
                          </h3>
                          {getStatusBadge(offre.status)}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {offre.data?.poste || "Sans titre"}
                        </p>
                      </div>
                      <FileCheck className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span className="truncate">{offre.client?.company_name || "Client inconnu"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span className="truncate">{offre.template?.name || "Template inconnu"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(offre.created_at).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {filteredOffres.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">Aucune offre trouvée pour "{searchQuery}"</div>
          )}
        </>
      )}
    </div>
  )
}
