"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, Mail, Phone, Building2, Calendar, Tag } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { Client } from "@/types/domain"

interface ClientInfoCardProps {
  client: Client
  onDelete?: (clientId: string) => Promise<void>
}

export function ClientInfoCard({ client, onDelete }: ClientInfoCardProps) {
  const router = useRouter()

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "Date invalide"
      return format(date, "dd MMMM yyyy", { locale: fr })
    } catch {
      return "Date invalide"
    }
  }

  const handleEdit = () => {
    router.push(`/clients/${client.id}?edit=true`)
  }

  const handleDelete = async () => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${client.company || client.name} ?`)) {
      return
    }

    if (onDelete) {
      try {
        await onDelete(client.id)
        toast.success("Client supprimé avec succès")
        router.push("/clients")
      } catch (error) {
        console.error("Error deleting client:", error)
        toast.error("Erreur lors de la suppression du client")
      }
    } else {
      // Fallback: appel API direct
      try {
        const response = await fetch(`/api/clients/${client.id}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          throw new Error("Erreur lors de la suppression")
        }

        toast.success("Client supprimé avec succès")
        router.push("/clients")
      } catch (error) {
        console.error("Error deleting client:", error)
        toast.error("Erreur lors de la suppression du client")
      }
    }
  }

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle>Fiche client</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Informations principales */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Entreprise</p>
              <p className="text-sm text-muted-foreground truncate">
                {client.company || client.name}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Email</p>
              {client.email ? (
                <a
                  href={`mailto:${client.email}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors truncate block"
                >
                  {client.email}
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Phone className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Téléphone</p>
              {client.phone ? (
                <a
                  href={`tel:${client.phone}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {client.phone}
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Client depuis</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(client.created_at)}
              </p>
            </div>
          </div>

          {client.tags.length > 0 && (
            <div className="flex items-start gap-3">
              <Tag className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground mb-2">Secteurs</p>
                <div className="flex flex-wrap gap-2">
                  {client.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-4 border-t">
          <Button onClick={handleEdit} variant="outline" className="w-full">
            <Edit className="mr-2 h-4 w-4" />
            Modifier
          </Button>
          <Button
            onClick={handleDelete}
            variant="outline"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

