"use client"

import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { Client } from "@/types/domain"

interface ClientRowActionsProps {
  client: Client
  onDelete?: (clientId: string) => Promise<void>
}

export function ClientRowActions({ client, onDelete }: ClientRowActionsProps) {
  const router = useRouter()

  const handleView = () => {
    router.push(`/clients/${client.id}`)
  }

  const handleEdit = () => {
    router.push(`/clients/${client.id}?edit=true`)
  }

  const handleDelete = async () => {
    if (!onDelete) {
      // Fallback: appel API direct
      if (!confirm(`Êtes-vous sûr de vouloir supprimer ${client.company || client.name} ?`)) {
        return
      }

      try {
        const response = await fetch(`/api/clients/${client.id}`, {
          method: "DELETE",
        })

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression")
      }

      toast.success("Client supprimé avec succès")
      // Le parent gère le refresh via onDelete callback
      } catch (error) {
        console.error("Error deleting client:", error)
        toast.error("Erreur lors de la suppression du client")
      }
      return
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${client.company || client.name} ?`)) {
      return
    }

    try {
      await onDelete(client.id)
      toast.success("Client supprimé avec succès")
    } catch (error) {
      console.error("Error deleting client:", error)
      toast.error("Erreur lors de la suppression du client")
    }
  }

  return (
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
        <DropdownMenuItem onClick={handleEdit}>
          <Edit className="mr-2 h-4 w-4" />
          Modifier
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

