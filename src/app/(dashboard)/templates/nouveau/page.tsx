"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Upload, FileText, Loader2, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react"
import { FileDropzone } from "@/components/file-dropzone"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"
import { serializeTemplateContent } from "@/lib/templates/content"
import { createTemplateFromParsedDocx } from "./actions"
import type { TemplateKind } from "@/types/domain"
import { templateConfigs } from "@/lib/templates/config"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

type PageState = "idle" | "parsing" | "redirecting" | "error"

// TODO: mock temporaire, remplacer par un vrai parser .docx
// Cette fonction simule le parsing d'un fichier .docx et doit être remplacée par une vraie implémentation
async function mockParseDocx(file: File): Promise<{
  title: string
  slug: string
  fields: any[]
}> {
  // Avertir en dev que c'est un mock
  if (process.env.NODE_ENV === 'development') {
    console.warn('[MOCK] mockParseDocx is being used - replace with real .docx parser')
  }
  
  // Simuler un délai de parsing
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Générer un titre basé sur le nom du fichier
  const baseName = file.name.replace(/\.docx?$/i, "")
  const title = baseName.charAt(0).toUpperCase() + baseName.slice(1)
  const slug = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  // Mock fields - dans la vraie implémentation, on parserait le .docx pour extraire les champs
  // On simule l'extraction de placeholders comme "{{nom_salarie}}", "{{poste}}", etc.
  const mockFields = [
    {
      id: `field-${Date.now()}-1`,
      field_name: "poste", // Nom simplifié du placeholder
      field_type: "text",
      placeholder: "Ex: Développeur Full-Stack",
      required: true,
      meta: {
        placeholderRaw: "{{poste}}", // Placeholder brut trouvé dans le doc
      },
    },
    {
      id: `field-${Date.now()}-2`,
      field_name: "salaire",
      field_type: "number",
      placeholder: "Ex: 50000",
      required: true,
      meta: {
        placeholderRaw: "{{salaire_brut}}",
      },
    },
    {
      id: `field-${Date.now()}-3`,
      field_name: "date_debut",
      field_type: "date",
      required: true,
      meta: {
        placeholderRaw: "{{date_embauche}}",
      },
    },
  ]

  return { title, slug, fields: mockFields }
}

export default function NewTemplatePage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [state, setState] = useState<PageState>("idle")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [templateKind, setTemplateKind] = useState<TemplateKind>("GENERIC")

  const handleFileSelect = async (file: File) => {
    // Validation supplémentaire côté client (double vérification)
    const maxSize = 10485760 // 10MB
    const acceptedExtensions = [".docx", ".doc"]
    const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`
    
    // Vérifier la taille
    if (file.size > maxSize) {
      const errorMessage = `Le fichier est trop volumineux (${(file.size / 1024 / 1024).toFixed(2)}MB). Taille maximale autorisée : ${(maxSize / 1024 / 1024).toFixed(0)}MB`
      setError(errorMessage)
      setState("error")
      toast.error(errorMessage)
      return
    }
    
    // Vérifier l'extension
    if (!acceptedExtensions.includes(fileExtension)) {
      const errorMessage = `Type de fichier non accepté (${fileExtension}). Formats acceptés : ${acceptedExtensions.join(", ")}`
      setError(errorMessage)
      setState("error")
      toast.error(errorMessage)
      return
    }

    // Réinitialiser les erreurs précédentes
    setError(null)
    setSelectedFile(file)
    setState("parsing")
    setProgress(0)

    try {
      // Simuler la progression du parsing
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // Parser le fichier (mock)
      const parsed = await mockParseDocx(file)

      clearInterval(progressInterval)
      setProgress(100)

      // Créer le template avec les données parsées via Server Action
      startTransition(() => {
        createTemplateFromParsedDocx({
          title: parsed.title,
          slug: parsed.slug,
          content: serializeTemplateContent(parsed.fields),
          template_kind: templateKind,
          category: "",
          tags: [],
        })
          .then((result) => {
            if (!result.success) {
              // Afficher un message d'erreur spécifique selon le code d'erreur
              let errorMessage: string
              
              // Messages spécifiques selon le type d'erreur
              switch (result.code) {
                case 'SLUG_TAKEN':
                case 'SLUG_ALREADY_EXISTS':
                  errorMessage = result.message || "Un template avec ce nom existe déjà dans votre organisation. Veuillez renommer votre fichier et réessayer."
                  break
                case 'VALIDATION_ERROR':
                  errorMessage = result.message || "Les données du template sont invalides. Veuillez vérifier le fichier et réessayer."
                  break
                case 'UNAUTHORIZED':
                  errorMessage = "Vous n'êtes pas autorisé à créer un template. Vérifiez vos permissions."
                  setTimeout(() => router.push('/templates'), 2000)
                  break
                case 'TEMPLATE_NOT_FOUND':
                  errorMessage = "Le template demandé est introuvable."
                  setTimeout(() => router.push('/templates'), 2000)
                  break
                case 'UNKNOWN_ERROR':
                  errorMessage = result.message || "Une erreur inattendue s'est produite lors de la création du template. Veuillez réessayer."
                  break
                default:
                  errorMessage = result.message || "Erreur lors de la création du template. Veuillez réessayer."
              }
              
              throw new Error(errorMessage)
            }

            setState("redirecting")
            toast.success("Template créé avec succès")
            
            // Rediriger vers la page d'édition
            setTimeout(() => {
              router.push(`/templates/${result.template.id}`)
              router.refresh()
            }, 500)
          })
          .catch((error) => {
            // Gérer les erreurs de création du template
            console.error("Error creating template:", error)
            
            let errorMessage: string
            if (error instanceof Error) {
              // Le message d'erreur vient déjà de la Server Action avec le bon format
              // On l'utilise directement s'il est explicite
              if (error.message && error.message !== "Error") {
                errorMessage = error.message
              } else if (error.message.includes("réseau") || error.message.includes("network") || error.message.includes("fetch")) {
                errorMessage = "Erreur de connexion. Vérifiez votre connexion internet et réessayez."
              } else {
                errorMessage = "Une erreur s'est produite lors de la création du template. Veuillez réessayer."
              }
            } else {
              errorMessage = "Une erreur inattendue s'est produite lors de la création du template. Veuillez réessayer."
            }
            
            setError(errorMessage)
            setState("error")
            toast.error(errorMessage)
          })
      })
    } catch (error) {
      console.error("Error parsing/creating template:", error)
      
      // Déterminer le message d'erreur explicite
      let errorMessage: string
      if (error instanceof Error) {
        if (error.message.includes("réseau") || error.message.includes("network") || error.message.includes("fetch")) {
          errorMessage = "Erreur de connexion. Vérifiez votre connexion internet et réessayez."
        } else if (error.message.includes("création") || error.message.includes("creation")) {
          errorMessage = "Impossible de créer le template. Vérifiez que le fichier est valide et réessayez."
        } else if (error.message && error.message !== "Error") {
          // Utiliser le message d'erreur s'il est explicite
          errorMessage = error.message
        } else {
          errorMessage = "Une erreur s'est produite lors du traitement du fichier. Veuillez réessayer."
        }
      } else {
        errorMessage = "Une erreur inattendue s'est produite lors du traitement du fichier. Veuillez réessayer."
      }
      
      setError(errorMessage)
      setState("error")
      toast.error(errorMessage)
    }
  }

  const handleRetry = () => {
    setState("idle")
    setError(null)
    setSelectedFile(null)
    setProgress(0)
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/templates">
          <Button variant="ghost" size="icon" aria-label="Retour aux templates">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nouveau template</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Importez un fichier Word (.docx) pour créer un template
          </p>
        </div>
      </div>

      {/* Card avec dropzone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import de fichier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {state === "idle" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-kind">Type de template</Label>
                <Select
                  value={templateKind}
                  onValueChange={(value) => setTemplateKind(value as TemplateKind)}
                  disabled={state !== "idle"}
                >
                  <SelectTrigger id="template-kind">
                    <SelectValue placeholder="Sélectionner un type de template" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(templateConfigs).map(([kind, config]) => (
                      <SelectItem key={kind} value={kind}>
                        <div className="flex flex-col">
                          <span>{config.label}</span>
                          {config.description && (
                            <span className="text-xs text-muted-foreground">
                              {config.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Le type de template détermine les règles métier et le mapping des placeholders.
                </p>
              </div>
              <FileDropzone
                onFileSelect={handleFileSelect}
                accept=".docx,.doc"
                maxSize={10485760}
              />
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Formats acceptés :</strong> .docx, .doc (max 10MB)
                </p>
                <p>
                  <strong>Note :</strong> Le fichier sera analysé pour extraire
                  automatiquement la structure du template.
                </p>
              </div>
            </div>
          )}

          {(state === "parsing" || isPending) && selectedFile && (
            <div className="space-y-6 py-8">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary/50" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">
                    {state === "parsing" ? "Analyse du fichier" : "Création du template"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {state === "parsing" 
                      ? "Extraction de la structure du template..."
                      : "Enregistrement en cours..."}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {selectedFile.name}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progression</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="text-xs text-muted-foreground text-center">
                Cette opération peut prendre quelques secondes...
              </div>
            </div>
          )}

          {state === "redirecting" && (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Template créé !</h3>
                <p className="text-sm text-muted-foreground">
                  Redirection vers la page d&apos;édition...
                </p>
              </div>
            </div>
          )}

          {state === "error" && (
            <div className="space-y-4 py-8">
              <Card className="border-destructive/50 bg-destructive/10">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-3">
                      <h3 className="font-semibold text-destructive">
                        Erreur lors du traitement du fichier
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {error || "Une erreur est survenue lors du traitement de votre fichier."}
                      </p>
                      {selectedFile && (
                        <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                          Fichier : {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          onClick={handleRetry}
                          className="gap-2"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Réessayer
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Afficher aussi le dropzone pour permettre un nouvel upload */}
              <div className="space-y-4 pt-4 border-t">
                <p className="text-sm font-medium">Ou essayez avec un autre fichier :</p>
                <FileDropzone
                  onFileSelect={handleFileSelect}
                  accept=".docx,.doc"
                  maxSize={10485760}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
