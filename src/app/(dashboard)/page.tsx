"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Users, FileText, FileCheck, TrendingUp, Clock, AlertCircle } from "lucide-react"
import { DateRangePicker } from "@/components/date-range-picker"
import type { DateRange } from "react-day-picker"
import { dataStore } from "@/lib/data-store"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import type { Offre, Client, Event } from "@/lib/types"

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [stats, setStats] = useState({
    totalClients: 0,
    totalTemplates: 0,
    totalOffres: 0,
    validatedOffres: 0,
    draftOffres: 0,
    downloadedOffres: 0,
  })
  const [recentOffres, setRecentOffres] = useState<(Offre & { client?: Client })[]>([])
  const [recentClients, setRecentClients] = useState<Client[]>([])
  const [recentEvents, setRecentEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [clients, templates, offres, events] = await Promise.all([
          dataStore.getClients(),
          dataStore.getTemplates(),
          dataStore.getOffres(),
          dataStore.getEvents(10),
        ])

        // Filter by date range if selected
        let filteredOffres = offres
        if (dateRange?.from && dateRange?.to) {
          filteredOffres = offres.filter((o) => {
            const offreDate = new Date(o.created_at)
            return offreDate >= dateRange.from! && offreDate <= dateRange.to!
          })
        }

        setStats({
          totalClients: clients.length,
          totalTemplates: templates.length,
          totalOffres: filteredOffres.length,
          validatedOffres: filteredOffres.filter((o) => o.status === "validated").length,
          draftOffres: filteredOffres.filter((o) => o.status === "draft").length,
          downloadedOffres: filteredOffres.filter((o) => o.status === "downloaded").length,
        })

        // Get recent offres with client info
        const sortedOffres = [...filteredOffres]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)

        const offresWithClients = await Promise.all(
          sortedOffres.map(async (offre) => {
            const client = await dataStore.getClient(offre.client_id)
            return { ...offre, client: client || undefined }
          }),
        )

        setRecentOffres(offresWithClients)

        // Get recent clients
        const sortedClients = [...clients]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
        setRecentClients(sortedClients)

        setRecentEvents(events)
      } catch (error) {
        console.error("[v0] Error loading dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [dateRange])

  const statCards = [
    {
      title: "Clients",
      value: stats.totalClients,
      icon: Users,
      color: "text-primary",
      description: "Clients actifs",
    },
    {
      title: "Templates",
      value: stats.totalTemplates,
      icon: FileText,
      color: "text-primary",
      description: "Modèles disponibles",
    },
    {
      title: "Offres totales",
      value: stats.totalOffres,
      icon: FileCheck,
      color: "text-primary",
      description: "Toutes périodes",
    },
    {
      title: "Taux validation",
      value: stats.totalOffres > 0 ? `${Math.round((stats.validatedOffres / stats.totalOffres) * 100)}%` : "0%",
      icon: TrendingUp,
      color: "text-primary",
      description: "Offres validées",
    },
  ]

  const statusConfig = {
    draft: { label: "Brouillon", variant: "secondary" as const },
    validated: { label: "Validée", variant: "default" as const },
    downloaded: { label: "Téléchargée", variant: "outline" as const },
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Vue d'ensemble de votre activité</p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="p-6 transition-all hover:shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="text-3xl font-bold text-foreground mt-2">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </div>
              <stat.icon className={`h-10 w-10 ${stat.color}`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Status Breakdown */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Répartition des offres</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Brouillons</p>
              <p className="text-2xl font-bold text-foreground">{stats.draftOffres}</p>
            </div>
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Validées</p>
              <p className="text-2xl font-bold text-foreground">{stats.validatedOffres}</p>
            </div>
            <FileCheck className="h-8 w-8 text-primary" />
          </div>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Téléchargées</p>
              <p className="text-2xl font-bold text-foreground">{stats.downloadedOffres}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
      </Card>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Offres */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Dernières offres</h2>
            <Link
              href="/offres"
              className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
            >
              Voir tout
            </Link>
          </div>
          <div className="space-y-4">
            {recentOffres.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune offre récente</p>
            ) : (
              recentOffres.map((offre) => (
                <Link
                  key={offre.id}
                  href={`/offres/${offre.id}`}
                  className="block p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{offre.client?.company_name || "Client"}</p>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {offre.data.poste || "Poste non défini"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(offre.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <Badge variant={statusConfig[offre.status].variant}>{statusConfig[offre.status].label}</Badge>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        {/* Recent Clients */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Nouveaux clients</h2>
            <Link
              href="/clients"
              className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
            >
              Voir tout
            </Link>
          </div>
          <div className="space-y-4">
            {recentClients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun client récent</p>
            ) : (
              recentClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="block p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{client.company_name}</p>
                      <p className="text-sm text-muted-foreground truncate mt-1">{client.contact_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(client.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <Badge variant="outline">{client.secteur}</Badge>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Activity Timeline */}
      {recentEvents.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Activité récente</h2>
          <div className="space-y-4">
            {recentEvents.map((event) => (
              <div key={event.id} className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{event.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(event.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
