import type { ClientWithOffersCount } from "@/types/domain"

/**
 * Filtre une liste de clients selon une requête de recherche et un filtre de secteur
 * @param clients - Liste des clients à filtrer
 * @param searchQuery - Terme de recherche (recherche dans entreprise, nom, email)
 * @param sectorFilter - Filtre de secteur ("all" pour tous, "none" pour sans secteur, ou nom du secteur)
 * @returns Liste filtrée des clients
 */
export function filterClients(
  clients: ClientWithOffersCount[],
  searchQuery: string,
  sectorFilter: string
): ClientWithOffersCount[] {
  return clients.filter((client) => {
    // Recherche dans entreprise, nom du contact, ou email
    const matchesSearch =
      client.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase())

    // Filtre par secteur
    const matchesSector =
      sectorFilter === "all" ||
      client.tags.includes(sectorFilter) ||
      (sectorFilter === "none" && client.tags.length === 0)

    return matchesSearch && matchesSector
  })
}

/**
 * Extrait la liste des secteurs uniques depuis une liste de clients
 * @param clients - Liste des clients
 * @returns Tableau des secteurs uniques (tags)
 */
export function extractSectorsFromClients(clients: ClientWithOffersCount[]): string[] {
  return Array.from(new Set(clients.flatMap((client) => client.tags))).filter(Boolean)
}


