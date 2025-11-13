"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { FileDropzone } from "@/components/file-dropzone"
import { toast } from "sonner"

export default function NewTemplatePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get("name") as string,
      file_path: `/templates/${selectedFile?.name || "template.docx"}`,
      preview_path: "/placeholder.svg?height=400&width=300",
      mapping_json: [],
    }

    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const template = await response.json()
        toast.success("Template créé avec succès")
        router.push(`/templates/${template.id}`)
        router.refresh()
      } else {
        toast.error("Erreur lors de la création du template")
      }
    } catch (error) {
      console.error("[v0] Error creating template:", error)
      toast.error("Erreur lors de la création du template")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/templates">
          <Button variant="ghost" size="icon" aria-label="Retour aux templates">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Nouveau template</h1>
          <p className="text-muted-foreground mt-2">Créez un nouveau modèle d'offre commerciale</p>
        </div>
      </div>

      {/* Form */}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du template</Label>
            <Input id="name" name="name" required placeholder="Ex: Offre Standard Recrutement" aria-required="true" />
          </div>

          <div className="space-y-2">
            <Label>Fichier template (.docx)</Label>
            <FileDropzone onFileSelect={setSelectedFile} accept=".docx,.doc" maxSize={10485760} />
            <p className="text-xs text-muted-foreground">
              Uploadez un fichier Word (.docx) avec des variables entre accolades
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading || !selectedFile} className="flex-1">
              {loading ? "Création..." : "Créer et configurer"}
            </Button>
            <Link href="/templates" className="flex-1">
              <Button type="button" variant="outline" className="w-full bg-transparent">
                Annuler
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  )
}
