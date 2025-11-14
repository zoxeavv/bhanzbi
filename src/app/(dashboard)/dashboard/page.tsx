import { KpiCard } from "@/components/dashboard/KpiCard"
import { RecentOffersTable } from "@/components/dashboard/RecentOffersTable"
import { Timeline } from "@/components/dashboard/Timeline"
import { RecentClients } from "@/components/dashboard/RecentClients"
import { DateRangePicker } from "@/components/date-range-picker"
import { Button } from "@/components/ui/button"
import { Plus, Users, FileText, FileCheck, TrendingUp } from "lucide-react"
import Link from "next/link"
import type { DateRange } from "react-day-picker"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"

export const dynamic = "force-dynamic"

// Mock data - À remplacer par des appels API réels
const mockKpis = {
  totalOffers: 42,
  totalClients: 18,
  totalTemplates: 12,
  totalRevenue: 125000,
}

const mockRecentOffers = [
  {
    id: "1",
    title: "Offre Senior Developer",
    total: 65000,
    created_at: "2024-12-15T10:30:00Z",
    clientName: "Acme Corp",
    status: "sent",
  },
  {
    id: "2",
    title: "Offre Product Manager",
    total: 75000,
    created_at: "2024-12-14T14:20:00Z",
    clientName: "TechStart",
    status: "draft",
  },
  {
    id: "3",
    title: "Offre UX Designer",
    total: 55000,
    created_at: "2024-12-13T09:15:00Z",
    clientName: "DesignCo",
    status: "accepted",
  },
  {
    id: "4",
    title: "Offre DevOps Engineer",
    total: 70000,
    created_at: "2024-12-12T16:45:00Z",
    clientName: "CloudSys",
    status: "sent",
  },
  {
    id: "5",
    title: "Offre Frontend Developer",
    total: 60000,
    created_at: "2024-12-11T11:00:00Z",
    clientName: "WebAgency",
    status: "draft",
  },
]

const mockTimeline = [
  {
    id: "1",
    type: "offer_created" as const,
    title: "Nouvelle offre créée",
    description: "Offre Senior Developer",
    timestamp: "2024-12-15T10:30:00Z",
    user: "Jean Dupont",
  },
  {
    id: "2",
    type: "offer_sent" as const,
    title: "Offre envoyée",
    description: "Offre Product Manager à TechStart",
    timestamp: "2024-12-14T14:20:00Z",
    user: "Marie Martin",
  },
  {
    id: "3",
    type: "client_added" as const,
    title: "Nouveau client ajouté",
    description: "DesignCo",
    timestamp: "2024-12-13T09:15:00Z",
    user: "Pierre Durand",
  },
  {
    id: "4",
    type: "template_created" as const,
    title: "Nouveau template créé",
    description: "Template Offre Technique",
    timestamp: "2024-12-12T16:45:00Z",
    user: "Sophie Bernard",
  },
  {
    id: "5",
    type: "offer_created" as const,
    title: "Nouvelle offre créée",
    description: "Offre DevOps Engineer",
    timestamp: "2024-12-11T11:00:00Z",
    user: "Jean Dupont",
  },
]

const mockRecentClients = [
  {
    id: "1",
    name: "Acme Corp",
    email: "contact@acme.com",
    phone: "+33 1 23 45 67 89",
    company: "Acme Corporation",
    created_at: "2024-12-15T10:30:00Z",
  },
  {
    id: "2",
    name: "TechStart",
    email: "hello@techstart.io",
    phone: "+33 1 98 76 54 32",
    company: "TechStart Inc.",
    created_at: "2024-12-14T14:20:00Z",
  },
  {
    id: "3",
    name: "DesignCo",
    email: "info@designco.fr",
    phone: "+33 1 55 44 33 22",
    company: "DesignCo Studio",
    created_at: "2024-12-13T09:15:00Z",
  },
  {
    id: "4",
    name: "CloudSys",
    email: "contact@cloudsys.com",
    phone: "+33 1 11 22 33 44",
    company: "CloudSys Solutions",
    created_at: "2024-12-12T16:45:00Z",
  },
  {
    id: "5",
    name: "WebAgency",
    email: "hello@webagency.fr",
    phone: "+33 1 99 88 77 66",
    company: "WebAgency",
    created_at: "2024-12-11T11:00:00Z",
  },
]

export default async function DashboardPage() {
  // TODO: Remplacer par des appels API réels
  // const data = await getDashboardData()

  return (
    <div className="space-y-6">
      {/* Header avec titre, sous-titre, date range et CTA */}
      <DashboardHeader />

      {/* Section KPIs - 4 cards cliquables */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total des offres"
          value={mockKpis.totalOffers}
          change={{
            value: 12,
            label: "vs mois dernier",
            trend: "up",
          }}
          icon={<FileCheck className="h-5 w-5 text-primary" />}
          href="/offres"
        />
        <KpiCard
          title="Clients"
          value={mockKpis.totalClients}
          change={{
            value: 5,
            label: "vs mois dernier",
            trend: "up",
          }}
          icon={<Users className="h-5 w-5 text-primary" />}
          href="/clients"
        />
        <KpiCard
          title="Templates"
          value={mockKpis.totalTemplates}
          change={{
            value: 2,
            label: "vs mois dernier",
            trend: "up",
          }}
          icon={<FileText className="h-5 w-5 text-primary" />}
          href="/templates"
        />
        <KpiCard
          title="Revenus totaux"
          value={new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "EUR",
          }).format(mockKpis.totalRevenue)}
          change={{
            value: 8,
            label: "vs mois dernier",
            trend: "up",
          }}
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
        />
      </div>

      {/* Grille principale : Offres récentes + Timeline */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section Offres récentes */}
        <RecentOffersTable offers={mockRecentOffers} maxItems={5} />

        {/* Section Activité récente (Timeline) */}
        <Timeline items={mockTimeline} maxItems={10} />
      </div>

      {/* Section Clients récents */}
      <RecentClients clients={mockRecentClients} maxItems={5} />
    </div>
  )
}
