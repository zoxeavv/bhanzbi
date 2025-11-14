"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import { Plus, Search, Building2 } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { ClientsTable } from "@/components/clients/ClientsTable"
import { toast } from "sonner"
import type { Client } from "@/types/domain"

interface ClientWithOffersCount extends Client {
  offersCount?: number
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<ClientWithOffersCount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sectorFilter, setSectorFilter] = useState<string>("all")

  useEffect(() => {
    async function loadClients() {
      try {
        const [clientsRes, offersRes] = await Promise.all([
          fetch("/api/clients"),
          fetch("/api/offres"),
        ])

        if (!clientsRes.ok) throw new Error("Failed to fetch clients")
        if (!offersRes.ok) throw new Error("Failed to fetch offers")

        const clientsData: Client[] = await clientsRes.json()
        const offersData = await offersRes.json()

        // Compter les offres par client
        const offersCountByClient: Record<string, number> = {}
        offersData.forEach((offer: { client_id: string }) => {
          offersCountByClient[offer.client_id] =
            (offersCountByClient[offer.client_id] || 0) + 1
        })

        const clientsWithCounts: ClientWithOffersCount[] = clientsData.map(
          (client) => ({
            ...client,
            offersCount: offersCountByClient[client.id] || 0,
          })
        )

        setClients(clientsWithCounts)
      } catch (error) {
        console.error("Error loading clients:", error)
        toast.error("Erreur lors du chargement des clients")
      } finally {
        setLoading(false)
      }
    }
    loadClients()
  }, [])

  // Extraire les secteurs uniques depuis les tags
  const sectors = Array.from(
    new Set(clients.flatMap((client) => client.tags))
  ).filter(Boolean)

  // Filtrer les clients
  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesSector =
      sectorFilter === "all" ||
      client.tags.includes(sectorFilter) ||
      (sectorFilter === "none" && client.tags.length === 0)

    return matchesSearch && matchesSector
  })

  const handleDelete = async (clientId: string) => {
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression")
      }

      // Retirer le client de la liste
      setClients((prev) => prev.filter((client) => client.id !== clientId))
      router.refresh()
    } catch (error) {
      console.error("Error deleting client:", error)
      throw error
    }
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
            <p className="text-sm text-muted-foreground">
              Gérez votre portefeuille clients et leurs offres commerciales
            </p>
          </div>
          <Link href="/clients/nouveau">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau client
            </Button>
          </Link>
        </div>

        {/* Search et filtres */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par entreprise, contact ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sectorFilter} onValueChange={setSectorFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Secteur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les secteurs</SelectItem>
              <SelectItem value="none">Non renseigné</SelectItem>
              {sectors.map((sector) => (
                <SelectItem key={sector} value={sector}>
                  {sector}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
      ) : filteredClients.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={
            clients.length === 0
              ? "Aucun client"
              : "Aucun client trouvé"
          }
          description={
            clients.length === 0
              ? "Commencez par ajouter votre premier client pour générer des offres commerciales."
              : "Aucun client ne correspond à vos critères de recherche."
          }
          actionLabel="Ajouter un client"
          actionHref="/clients/nouveau"
        />
      ) : (
        <ClientsTable clients={filteredClients} onDelete={handleDelete} />
      )}
    </div>
  )
}
