"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { Template, FieldMapping } from "@/lib/types"

export default function TemplateDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [template, setTemplate] = useState<Template | null>(null)
  const [fields, setFields] = useState<FieldMapping[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id === "nouveau") {
      router.replace("/templates/nouveau")
      return
    }

    async function loadTemplate() {
      try {
        const response = await fetch(`/api/templates/${params.id}`)

        if (!response.ok) {
          throw new Error("Template not found")
        }

        const data = await response.json()
        setTemplate(data)
        setFields(data.mapping_json || [])
      } catch (error) {
        toast.error("Erreur lors du chargement du template")
        router.push("/templates")
      } finally {
        setLoading(false)
      }
    }
    loadTemplate()
  }, [params.id, router])

  function addField() {
    setFields([...fields, { field_name: "", field_type: "text", placeholder: "" }])
  }

  function removeField(index: number) {
    setFields(fields.filter((_, i) => i !== index))
  }

  function updateField(index: number, updates: Partial<FieldMapping>) {
    setFields(fields.map((field, i) => (i === index ? { ...field, ...updates } : field)))
  }

  async function handleSave() {
    setLoading(true)
    try {
      await fetch(`/api/templates/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping_json: fields }),
      })
      toast.success("Template enregistré")
      router.push("/templates")
      router.refresh()
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setLoading(false)
    }
  }

  if (loading || !template) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/templates">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{template.name}</h1>
          <p className="text-muted-foreground mt-2">Configuration du mapping des champs</p>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          Enregistrer
        </Button>
      </div>

      {/* Fields Configuration */}
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Champs du template</h2>
            <Button onClick={addField} variant="outline" size="sm" className="gap-2 bg-transparent">
              <Plus className="h-4 w-4" />
              Ajouter un champ
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={index} className="flex gap-4 p-4 bg-secondary rounded-lg">
                <div className="flex-1 grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Nom du champ</Label>
                    <Input
                      value={field.field_name}
                      onChange={(e) => updateField(index, { field_name: e.target.value })}
                      placeholder="Ex: poste"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={field.field_type}
                      onValueChange={(value) => updateField(index, { field_type: value as FieldMapping["field_type"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Texte</SelectItem>
                        <SelectItem value="number">Nombre</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="select">Liste</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Placeholder</Label>
                    <Input
                      value={field.placeholder || ""}
                      onChange={(e) => updateField(index, { placeholder: e.target.value })}
                      placeholder="Ex: Développeur Full-Stack"
                    />
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeField(index)} className="mt-8">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}

            {fields.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Aucun champ configuré. Cliquez sur "Ajouter un champ" pour commencer.
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
