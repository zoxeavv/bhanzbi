"use client"

import { useState, useEffect, useTransition, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, AlertCircle, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { TemplateStructurePanel } from "@/components/templates/TemplateStructurePanel"
import { TemplatePreview } from "@/components/templates/TemplatePreview"
import type { TemplateField } from "@/lib/templates/schema"
import type { Template } from "@/types/domain"
import { parseTemplateContent, serializeTemplateContent } from "@/lib/templates/content"
import { Card, CardContent } from "@/components/ui/card"
import { updateTemplateAction, resetTemplateStructure } from "@/app/(dashboard)/templates/actions"

interface TemplateDetailClientProps {
  template: Template
  initialFields: TemplateField[]
  hasInvalidContent: boolean
}

export function TemplateDetailClient({
  template: initialTemplate,
  initialFields,
  hasInvalidContent: initialHasInvalidContent,
}: TemplateDetailClientProps) {
  const router = useRouter()
  const [template, setTemplate] = useState(initialTemplate)
  const [fields, setFields] = useState(initialFields)
  const [isPending, startTransition] = useTransition()
  const [hasChanges, setHasChanges] = useState(false)
  const [hasInvalidContent, setHasInvalidContent] = useState(initialHasInvalidContent)
  const [areFieldsValid, setAreFieldsValid] = useState(true)

  // Mémoriser le contenu original pour éviter de le recalculer à chaque render
  const originalContent = useMemo(() => {
    const originalFields = parseTemplateContent(template.content)
    return serializeTemplateContent(originalFields)
  }, [template.content])

  // Ref pour stocker le timeout du debounce
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Nettoyer le timeout précédent si il existe
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Débouncer la détection des changements pour éviter les recalculs trop fréquents
    // Délai de 300ms : bon compromis entre réactivité et performance
    debounceTimeoutRef.current = setTimeout(() => {
      // Comparer le contenu actuel avec le contenu original mémorisé
      const currentContent = serializeTemplateContent(fields)
      setHasChanges(currentContent !== originalContent)
    }, 300)

    // Cleanup : nettoyer le timeout si le composant se démonte ou si les dépendances changent
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [fields, originalContent])

  const handleSave = () => {
    startTransition(async () => {
      try {
        const content = serializeTemplateContent(fields)
        const result = await updateTemplateAction(template.id, { content })

        if (!result.ok) {
          // Afficher un message d'erreur spécifique selon le code
          let errorMessage = result.message || "Erreur lors de l'enregistrement du template"
          
          // Messages spécifiques selon le type d'erreur
          switch (result.code) {
            case 'TEMPLATE_NOT_FOUND':
              errorMessage = "Le template n'existe plus ou a été supprimé. Vous allez être redirigé vers la liste des templates."
              toast.error(errorMessage)
              setTimeout(() => router.push('/templates'), 2000)
              return
            case 'UNAUTHORIZED':
              errorMessage = "Vous n'êtes plus autorisé à modifier ce template. Vérifiez vos permissions."
              toast.error(errorMessage)
              setTimeout(() => router.push('/templates'), 2000)
              return
            case 'INVALID_CONTENT_STRUCTURE':
              errorMessage = result.message || "La structure du template est invalide. Veuillez vérifier que tous les champs sont correctement configurés."
              toast.error(errorMessage, { duration: 6000 })
              return
            case 'VALIDATION_ERROR':
              errorMessage = result.message || "Les données du template ne sont pas valides. Veuillez vérifier les champs et réessayer."
              toast.error(errorMessage, { duration: 5000 })
              return
            case 'UNKNOWN_ERROR':
              errorMessage = result.message || "Une erreur inattendue s'est produite lors de l'enregistrement. Veuillez réessayer."
              toast.error(errorMessage)
              return
            default:
              toast.error(errorMessage)
          }
          return
        }

        setTemplate(result.template)
        setHasChanges(false)
        setHasInvalidContent(false) // Réinitialiser le flag d'erreur après sauvegarde
        toast.success("Template enregistré avec succès")
        router.refresh()
      } catch (error) {
        console.error("Error saving template:", error)
        const errorMessage = error instanceof Error 
          ? `Erreur lors de l'enregistrement : ${error.message}`
          : "Erreur lors de l'enregistrement du template. Veuillez réessayer."
        toast.error(errorMessage)
      }
    })
  }

  const handleResetStructure = () => {
    startTransition(async () => {
      try {
        const result = await resetTemplateStructure(template.id)

        if (!result.ok) {
          // Afficher un message d'erreur spécifique selon le code
          let errorMessage = result.message || "Erreur lors de la réinitialisation du template"
          
          // Messages spécifiques selon le type d'erreur
          switch (result.code) {
            case 'TEMPLATE_NOT_FOUND':
              errorMessage = "Le template n'existe plus ou a été supprimé. Vous allez être redirigé vers la liste des templates."
              toast.error(errorMessage)
              setTimeout(() => router.push('/templates'), 2000)
              return
            case 'UNAUTHORIZED':
              errorMessage = "Vous n'êtes plus autorisé à modifier ce template. Vérifiez vos permissions."
              toast.error(errorMessage)
              setTimeout(() => router.push('/templates'), 2000)
              return
            case 'UNKNOWN_ERROR':
              errorMessage = result.message || "Une erreur inattendue s'est produite lors de la réinitialisation. Veuillez réessayer."
              toast.error(errorMessage)
              return
            default:
              toast.error(errorMessage)
          }
          return
        }

        setTemplate(result.template)
        setFields([])
        setHasChanges(false)
        setHasInvalidContent(false)
        toast.success("Structure du template réinitialisée avec succès")
        router.refresh()
      } catch (error) {
        console.error("Error resetting template:", error)
        const errorMessage = error instanceof Error 
          ? `Erreur lors de la réinitialisation : ${error.message}`
          : "Erreur lors de la réinitialisation du template. Veuillez réessayer."
        toast.error(errorMessage)
      }
    })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        <div className="flex items-center gap-4">
          <Link href="/templates">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">
              {template.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configurez la structure de votre template
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3">
            <Badge variant={hasChanges ? "default" : "secondary"}>
              {hasChanges ? "Modifications non enregistrées" : "À jour"}
            </Badge>
            <Button
              onClick={handleSave}
              disabled={isPending || !hasChanges || !areFieldsValid}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
          {!areFieldsValid && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive font-medium">
                Veuillez corriger les erreurs dans les champs avant d&apos;enregistrer
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Message d'erreur si content invalide */}
      {hasInvalidContent && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-destructive">
                  Structure du template corrompue
                </h3>
                <p className="text-sm text-muted-foreground">
                  Impossible de lire la structure de ce template. Le contenu semble corrompu ou dans un format non supporté.
                </p>
                <p className="text-sm text-muted-foreground">
                  Vous pouvez continuer à utiliser l&apos;éditeur pour créer une nouvelle structure, ou réinitialiser le template.
                </p>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetStructure}
                    disabled={isPending}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {isPending ? "Réinitialisation..." : "Réinitialiser la structure"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Split Panel Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Panneau gauche - Structure */}
        <div className="flex flex-col min-h-0 border rounded-lg p-6 bg-muted/30">
          <TemplateStructurePanel 
            fields={fields} 
            onFieldsChange={setFields}
            onValidationChange={setAreFieldsValid}
          />
        </div>

        {/* Panneau droite - Preview */}
        <div className="flex flex-col min-h-0 border rounded-lg p-6 bg-background">
          <TemplatePreview fields={fields} />
        </div>
      </div>
    </div>
  )
}

