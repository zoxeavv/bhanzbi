import type { Client, Template, Offre, OffreVersion, Event } from "./types"

// Stockage en mémoire pour la démo
const clients: Client[] = [
  {
    id: "1",
    company_name: "TechCorp Solutions",
    contact_name: "Marie Dubois",
    email: "marie.dubois@techcorp.fr",
    phone: "+33 1 23 45 67 89",
    secteur: "Technologie",
    created_at: new Date("2024-01-15").toISOString(),
  },
  {
    id: "2",
    company_name: "Finance Plus",
    contact_name: "Jean Martin",
    email: "j.martin@financeplus.fr",
    phone: "+33 1 98 76 54 32",
    secteur: "Finance",
    created_at: new Date("2024-02-20").toISOString(),
  },
  {
    id: "3",
    company_name: "Retail Group",
    contact_name: "Sophie Laurent",
    email: "sophie@retailgroup.fr",
    phone: "+33 1 11 22 33 44",
    secteur: "Commerce",
    created_at: new Date("2024-03-10").toISOString(),
  },
]

const templates: Template[] = [
  {
    id: "1",
    name: "Offre Standard Recrutement",
    file_path: "/templates/standard.docx",
    preview_path: "/placeholder.svg?height=400&width=300",
    mapping_json: [
      { field_name: "poste", field_type: "text", placeholder: "Ex: Développeur Full-Stack" },
      { field_name: "nb_postes", field_type: "number", placeholder: "1" },
      { field_name: "tarif_journalier", field_type: "number", placeholder: "Ex: 500" },
      { field_name: "duree_mission", field_type: "text", placeholder: "Ex: 6 mois" },
      { field_name: "date_debut", field_type: "date" },
    ],
    created_at: new Date("2024-01-01").toISOString(),
  },
  {
    id: "2",
    name: "Offre Premium Executive",
    file_path: "/templates/premium.docx",
    preview_path: "/placeholder.svg?height=400&width=300",
    mapping_json: [
      { field_name: "poste", field_type: "text", placeholder: "Ex: Directeur Technique" },
      { field_name: "nb_postes", field_type: "number", placeholder: "1" },
      { field_name: "package_annuel", field_type: "number", placeholder: "Ex: 120000" },
      { field_name: "avantages", field_type: "text", placeholder: "Ex: Voiture de fonction, télétravail" },
      { field_name: "date_debut", field_type: "date" },
    ],
    created_at: new Date("2024-01-15").toISOString(),
  },
]

const offres: Offre[] = [
  {
    id: "1",
    template_id: "1",
    client_id: "1",
    status: "validated",
    data: {
      poste: "Développeur React Senior",
      nb_postes: 2,
      tarif_journalier: 550,
      duree_mission: "12 mois",
      date_debut: "2024-04-01",
    },
    created_at: new Date("2024-03-15").toISOString(),
    updated_at: new Date("2024-03-16").toISOString(),
  },
  {
    id: "2",
    template_id: "2",
    client_id: "2",
    status: "draft",
    data: {
      poste: "CTO",
      nb_postes: 1,
      package_annuel: 150000,
      avantages: "Voiture, stock-options",
      date_debut: "2024-05-01",
    },
    created_at: new Date("2024-03-20").toISOString(),
    updated_at: new Date("2024-03-20").toISOString(),
  },
]

const versions: OffreVersion[] = []
const events: Event[] = []

// API functions
export const dataStore = {
  // Clients
  getClients: async (): Promise<Client[]> => {
    return [...clients]
  },
  getClient: async (id: string): Promise<Client | null> => {
    return clients.find((c) => c.id === id) || null
  },
  createClient: async (client: Omit<Client, "id" | "created_at">): Promise<Client> => {
    const newClient: Client = {
      ...client,
      id: String(clients.length + 1),
      created_at: new Date().toISOString(),
    }
    clients.push(newClient)
    return newClient
  },
  updateClient: async (id: string, updates: Partial<Client>): Promise<Client | null> => {
    const index = clients.findIndex((c) => c.id === id)
    if (index === -1) return null
    clients[index] = { ...clients[index], ...updates }
    return clients[index]
  },
  deleteClient: async (id: string): Promise<boolean> => {
    const index = clients.findIndex((c) => c.id === id)
    if (index === -1) return false
    clients.splice(index, 1)
    return true
  },

  // Templates
  getTemplates: async (): Promise<Template[]> => {
    return [...templates]
  },
  getTemplate: async (id: string): Promise<Template | null> => {
    return templates.find((t) => t.id === id) || null
  },
  createTemplate: async (template: Omit<Template, "id" | "created_at">): Promise<Template> => {
    const newTemplate: Template = {
      ...template,
      id: String(templates.length + 1),
      created_at: new Date().toISOString(),
    }
    templates.push(newTemplate)
    return newTemplate
  },
  deleteTemplate: async (id: string): Promise<boolean> => {
    const index = templates.findIndex((t) => t.id === id)
    if (index === -1) return false
    const usedByOffre = offres.some((o) => o.template_id === id)
    if (usedByOffre) return false
    templates.splice(index, 1)
    return true
  },

  // Offres
  getOffres: async (): Promise<Offre[]> => {
    return [...offres]
  },
  getOffre: async (id: string): Promise<Offre | null> => {
    return offres.find((o) => o.id === id) || null
  },
  createOffre: async (offre: Omit<Offre, "id" | "created_at" | "updated_at">): Promise<Offre> => {
    const newOffre: Offre = {
      ...offre,
      id: String(offres.length + 1),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    offres.push(newOffre)
    return newOffre
  },
  updateOffre: async (id: string, updates: Partial<Offre>): Promise<Offre | null> => {
    const index = offres.findIndex((o) => o.id === id)
    if (index === -1) return null
    offres[index] = {
      ...offres[index],
      ...updates,
      updated_at: new Date().toISOString(),
    }
    return offres[index]
  },
  deleteOffre: async (id: string): Promise<boolean> => {
    const index = offres.findIndex((o) => o.id === id)
    if (index === -1) return false
    offres.splice(index, 1)
    return true
  },

  getOffreVersions: async (offreId: string): Promise<OffreVersion[]> => {
    return versions.filter((v) => v.offre_id === offreId).sort((a, b) => b.version_number - a.version_number)
  },
  createOffreVersion: async (
    version: Omit<OffreVersion, "id" | "created_at" | "version_number">,
  ): Promise<OffreVersion> => {
    const existingVersions = versions.filter((v) => v.offre_id === version.offre_id)
    const newVersion: OffreVersion = {
      ...version,
      id: String(versions.length + 1),
      version_number: existingVersions.length + 1,
      created_at: new Date().toISOString(),
    }
    versions.push(newVersion)
    return newVersion
  },

  createEvent: async (event: Omit<Event, "id" | "created_at">): Promise<Event> => {
    const newEvent: Event = {
      ...event,
      id: String(events.length + 1),
      created_at: new Date().toISOString(),
    }
    events.push(newEvent)
    return newEvent
  },
  getEvents: async (limit?: number): Promise<Event[]> => {
    const sorted = [...events].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return limit ? sorted.slice(0, limit) : sorted
  },
}
