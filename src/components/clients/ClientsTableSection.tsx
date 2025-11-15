"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClientsTable } from "./ClientsTable";
import { ClientsSearchBar } from "./ClientsSearchBar";
import { deleteClient } from "./ClientDeleteButton";
import { Building2 } from "lucide-react";
import type { Client } from "@/types/domain";
import { toast } from "sonner";

interface ClientsTableSectionProps {
  initialClients: Client[];
}

/**
 * Composant client pour la section table avec recherche
 * 
 * Recherche côté serveur avec debounce pour optimiser les performances.
 * Utilise l'API /api/clients avec le paramètre search.
 */
export function ClientsTableSection({ initialClients }: ClientsTableSectionProps) {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSearch, setCurrentSearch] = useState("");
  
  // Fonction pour récupérer les clients depuis l'API
  const fetchClients = useCallback(async (searchTerm: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) {
        params.set("search", searchTerm.trim());
      }
      
      const url = `/api/clients${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des clients");
      }

      const result = await response.json();
      // L'API retourne { data, page, pageSize, totalCount }
      setClients(result.data || []);
      setCurrentSearch(searchTerm);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Erreur lors de la recherche");
      // En cas d'erreur, garder les clients initiaux
      setClients(initialClients);
    } finally {
      setIsLoading(false);
    }
  }, [initialClients]);

  // Handler pour la recherche
  const handleSearchChange = useCallback((searchTerm: string) => {
    // Si recherche vide, utiliser les clients initiaux
    if (searchTerm.trim() === "") {
      setClients(initialClients);
      setCurrentSearch("");
      return;
    }
    // Sinon, faire l'appel API
    fetchClients(searchTerm);
  }, [fetchClients, initialClients]);
  
  // Handler pour la suppression avec rafraîchissement de la recherche
  const handleDelete = useCallback(async (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    const clientName = client.company || client.name || "ce client";
    
    try {
      await deleteClient(clientId, clientName, async () => {
        // Rafraîchir les données en refaisant la recherche actuelle
        await fetchClients(currentSearch);
        // Rafraîchir aussi côté serveur pour mettre à jour les stats
        router.refresh();
      });
    } catch (error) {
      // L'erreur est déjà gérée dans deleteClient
    }
  }, [clients, currentSearch, fetchClients, router]);

  return (
    <div className="space-y-4">
      {/* Barre de recherche */}
      <ClientsSearchBar
        onSearchChange={handleSearchChange}
        isLoading={isLoading}
      />
      
      {/* Table ou Empty State */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Recherche en cours...
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={currentSearch.trim() ? "Aucun résultat" : "Aucun client"}
          description={
            currentSearch.trim()
              ? "Aucun client ne correspond à ces critères."
              : "Commencez par ajouter votre premier client."
          }
          actionLabel="Ajouter un client"
          actionHref="/clients/nouveau"
        />
      ) : (
        <ClientsTable clients={clients} onDelete={handleDelete} />
      )}
    </div>
  );
}
