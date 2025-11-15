"use client"

import { useState } from "react"
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { Client } from "@/types/domain"
import { handleClientError } from "@/lib/utils/error-handling"

interface ClientRowActionsProps {
  client: Client
  onDelete?: (clientId: string) => Promise<void>
}

export function ClientRowActions({ client, onDelete }: ClientRowActionsProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const handleView = () => {
    router.push(`/clients/${client.id}`)
  }

  const handleEdit = () => {
    router.push(`/clients/${client.id}?edit=true`)
  }

  const handleDeleteClick = () => {
    if (isDeleting) return
    setIsConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (isDeleting) return

    // Si onDelete est fourni, on délègue la confirmation au parent
    if (onDelete) {
      try {
        setIsDeleting(true)
        await onDelete(client.id)
        // Pas de toast ici : le parent gère déjà le succès
        setIsConfirmOpen(false)
      } catch (error) {
        const errorMessage = handleClientError(error, "deleteClient")
        toast.error(errorMessage)
        // Garder le dialog ouvert en cas d'erreur pour que l'utilisateur puisse réessayer
      } finally {
        setIsDeleting(false)
      }
      return
    }

    // Si onDelete n'est pas fourni, on gère la suppression directement
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Client introuvable ou vous n'avez pas les droits")
        }
        throw new Error("Erreur lors de la suppression")
      }

      toast.success("Client supprimé avec succès")
      setIsConfirmOpen(false)
      router.refresh()
    } catch (error) {
      const errorMessage = handleClientError(error, "deleteClient")
      toast.error(errorMessage)
      // Garder le dialog ouvert en cas d'erreur pour que l'utilisateur puisse réessayer
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Ouvrir le menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleView}>
            <Eye className="mr-2 h-4 w-4" />
            Voir
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEdit} disabled={isDeleting}>
            <Edit className="mr-2 h-4 w-4" />
            Modifier
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="Confirmer la suppression"
        description={`Êtes-vous sûr de vouloir supprimer ${client.company || client.name} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        variant="destructive"
      />
    </>
  )
}

