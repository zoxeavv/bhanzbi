"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Search, FileText } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { OffersTable } from "@/components/offres/OffersTable"
import { toast } from "sonner"
import type { Offer } from "@/types/domain"
import type { Client } from "@/types/domain"
import type { Template } from "@/types/domain"
import { fetchJsonOrThrow } from "@/lib/api/fetchJson"

interface OfferWithRelations extends Offer {
  clientName?: string
  templateName?: string
}

export default function OffresPage() {
  const [offers, setOffers] = useState<OfferWithRelations[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [clientFilter, setClientFilter] = useState<string>("all")

  useEffect(() => {
    async function loadData() {
      try {
        const [offersData, clientsResult, templatesData] = await Promise.all([
          fetchJsonOrThrow<Offer[]>("/api/offres"),
          fetchJsonOrThrow<{ data: Client[]; page: number; pageSize: number; totalCount: number }>("/api/clients"),
          fetchJsonOrThrow<Template[]>("/api/templates"),
        ])

        // L'API /api/clients retourne toujours { data, page, pageSize, totalCount }
        const clientsData: Client[] = clientsResult.data ?? []

        // Créer des maps pour enrichir les offres
        const clientsMap = new Map(clientsData.map((c) => [c.id, c.company || c.name]))
        const templatesMap = new Map(templatesData.map((t) => [t.id, t.title]))

        // Enrichir les offres avec les noms
        const enrichedOffers: OfferWithRelations[] = offersData.map((offer) => ({
          ...offer,
          clientName: clientsMap.get(offer.client_id),
          templateName: offer.template_id ? templatesMap.get(offer.template_id) : undefined,
        }))

        setOffers(enrichedOffers)
        setClients(clientsData)
        setTemplates(templatesData)
      } catch (error) {
        console.error("Error loading data:", error)
        const errorMessage = error instanceof Error ? error.message : "Erreur lors du chargement des offres"
        toast.error(errorMessage)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Filtrer les offres
  const filteredOffers = offers.filter((offer) => {
    const matchesSearch =
      offer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.id.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === "all" || offer.status === statusFilter

    const matchesClient =
      clientFilter === "all" || offer.client_id === clientFilter

    return matchesSearch && matchesStatus && matchesClient
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Offres</h1>
            <p className="text-sm text-muted-foreground">
              Gérez vos offres commerciales et suivez leur statut
            </p>
          </div>
          <Link href="/offres/nouveau">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle offre
            </Button>
          </Link>
        </div>

        {/* Search et filtres */}
        {!loading && offers.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par titre, client ou ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="sent">Envoyée</SelectItem>
                <SelectItem value="accepted">Acceptée</SelectItem>
                <SelectItem value="rejected">Refusée</SelectItem>
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les clients</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.company || client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 w-full animate-pulse rounded-md bg-muted"
            />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucune offre"
          description="Créez votre première offre commerciale pour commencer."
          actionLabel="Créer une offre"
          actionHref="/offres/nouveau"
        />
      ) : filteredOffers.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucune offre trouvée"
          description="Aucune offre ne correspond à vos critères de recherche."
          actionLabel="Créer une offre"
          actionHref="/offres/nouveau"
        />
      ) : (
        <OffersTable offers={filteredOffers} />
      )}
    </div>
  )
}
