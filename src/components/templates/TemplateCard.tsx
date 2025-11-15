"use client"

import { useTransition } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Calendar, Settings, Copy, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { parseTemplateContent } from "@/lib/templates/content"
import { duplicateTemplate } from "@/app/(dashboard)/templates/actions"

interface TemplateCardProps {
  template: {
    id: string
    title: string
    content: string
    category: string
    tags: string[]
    created_at: string
    lastUsedAt?: string | null
  }
}

function countFields(content: string): number {
  // Parser le contenu JSON pour obtenir les champs
  const fields = parseTemplateContent(content)
  // Retourner le nombre de champs (0 si le contenu est invalide)
  return fields.length
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "Jamais utilisé"
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "Date invalide"
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: fr,
    })
  } catch {
    return "Date invalide"
  }
}

export function TemplateCard({ template }: TemplateCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const fieldsCount = countFields(template.content)
  const createdDate = new Date(template.created_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  const handleDuplicate = () => {
    startTransition(() => {
      duplicateTemplate(template.id)
        .then((result) => {
          if (!result.success) {
            // Afficher un message d'erreur spécifique selon le code d'erreur
            let errorMessage: string
            
            // Messages spécifiques selon le type d'erreur
            switch (result.code) {
              case 'TEMPLATE_NOT_FOUND':
                errorMessage = result.message || "Le template à dupliquer n'existe plus ou a été supprimé."
                break
              case 'SLUG_TAKEN':
              case 'SLUG_ALREADY_EXISTS':
                errorMessage = result.message || "Impossible de créer une copie : un template avec ce nom existe déjà dans votre organisation. Veuillez réessayer."
                break
              case 'UNAUTHORIZED':
                errorMessage = "Vous n'êtes pas autorisé à dupliquer ce template. Vérifiez vos permissions."
                break
              case 'VALIDATION_ERROR':
                errorMessage = result.message || "Les données du template sont invalides. Impossible de créer la copie."
                break
              case 'UNKNOWN_ERROR':
                errorMessage = result.message || "Une erreur inattendue s'est produite lors de la duplication. Veuillez réessayer."
                break
              default:
                errorMessage = result.message || "Erreur lors de la duplication du template. Veuillez réessayer."
            }
            
            throw new Error(errorMessage)
          }

          toast.success("Template dupliqué avec succès")
          router.push(`/templates/${result.template.id}`)
          router.refresh()
        })
        .catch((error) => {
          console.error("Error duplicating template:", error)
          let errorMessage: string
          if (error instanceof Error) {
            // Le message d'erreur vient déjà de la Server Action avec le bon format
            if (error.message && error.message !== "Error") {
              errorMessage = error.message
            } else {
              errorMessage = "Une erreur s'est produite lors de la duplication du template. Veuillez réessayer."
            }
          } else {
            errorMessage = "Une erreur inattendue s'est produite lors de la duplication du template. Veuillez réessayer."
          }
          toast.error(errorMessage)
        })
    })
  }

  return (
    <Card className="h-full flex flex-col hover:border-primary transition-all hover:shadow-lg group">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2">
              {template.title}
            </h3>
            {template.category && (
              <Badge variant="secondary" className="text-xs">
                {template.category}
              </Badge>
            )}
          </div>
          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>{fieldsCount} champ{fieldsCount > 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Créé le {createdDate}</span>
          </div>
          {template.lastUsedAt && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Utilisé {formatDate(template.lastUsedAt)}</span>
            </div>
          )}
          {!template.lastUsedAt && (
            <div className="flex items-center gap-2 text-muted-foreground/70">
              <Calendar className="h-4 w-4" />
              <span>Jamais utilisé</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Link href={`/templates/${template.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full gap-2">
              <Settings className="h-4 w-4" />
              Configurer
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleDuplicate}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Duplication...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Dupliquer
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

