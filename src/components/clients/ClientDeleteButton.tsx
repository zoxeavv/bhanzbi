"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Client } from "@/types/domain";

interface UseClientDeleteOptions {
  onDeleteSuccess?: () => Promise<void>;
}

/**
 * Hook encapsulant la logique de suppression d'un client avec confirmation
 * 
 * Gère la confirmation, l'appel API, et les notifications.
 * 
 * @param client - Le client à supprimer
 * @param options - Options incluant le callback de succès
 * @returns Objet avec handleDelete et isDeleting
 */
export function useClientDelete(
  client: Client,
  options?: UseClientDeleteOptions
) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const clientName = client.company || client.name || "ce client";
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${clientName} ?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Client introuvable ou vous n'avez pas les droits");
        }
        throw new Error("Erreur lors de la suppression");
      }

      toast.success("Client supprimé avec succès");

      // Appeler le callback de succès si fourni
      if (options?.onDeleteSuccess) {
        await options.onDeleteSuccess();
      }

      // Rafraîchir côté serveur pour mettre à jour les stats
      router.refresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la suppression";
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    handleDelete,
    isDeleting,
  };
}

/**
 * Fonction utilitaire pour supprimer un client (pour usage sans hook)
 * 
 * @param clientId - ID du client à supprimer
 * @param clientName - Nom du client pour la confirmation
 * @param onDeleteSuccess - Callback appelé après succès
 */
export async function deleteClient(
  clientId: string,
  clientName: string,
  onDeleteSuccess?: () => Promise<void>
): Promise<void> {
  if (!confirm(`Êtes-vous sûr de vouloir supprimer ${clientName} ?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/clients/${clientId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Client introuvable ou vous n'avez pas les droits");
      }
      throw new Error("Erreur lors de la suppression");
    }

    toast.success("Client supprimé avec succès");

    // Appeler le callback de succès si fourni
    if (onDeleteSuccess) {
      await onDeleteSuccess();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erreur lors de la suppression";
    toast.error(errorMessage);
    throw error;
  }
}

