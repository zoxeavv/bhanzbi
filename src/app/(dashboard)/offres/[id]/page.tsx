"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Check, History } from "lucide-react"
import { PDFPreview } from "@/components/pdf-preview"
import { VersionTimeline } from "@/components/version-timeline"
import { toast } from "sonner"
import type { Offre, Template, Client } from "@/lib/types"

export default function OffreDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [offre, setOffre] = useState<Offre | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadOffre() {
      try {
        const response = await fetch(`/api/offres/${params.id}`)

        if (!response.ok) {
          throw new Error("Offre not found")
        }

        const offreData = await response.json()
        setOffre(offreData)
        setFormData(offreData.data || {})

        const [templateRes, clientRes] = await Promise.all([
          fetch(`/api/templates/${offreData.template_id}`),
          fetch(`/api/clients/${offreData.client_id}`),
        ])
        setTemplate(await templateRes.json())
        setClient(await clientRes.json())
      } catch (error) {
        console.error("[v0] Error loading offre:", error)
        toast.error("Erreur lors du chargement de l'offre")
        router.push("/offres")
      } finally {
        setLoading(false)
      }
    }
    loadOffre()
  }, [params.id, router])

  async function handleSave() {
    setLoading(true)
    try {
      await fetch(`/api/offres/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: formData }),
      })
      toast.success("Offre enregistrée")
      router.refresh()
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setLoading(false)
    }
  }

  async function handleValidate() {
    setLoading(true)
    try {
      await fetch(`/api/offres/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "validated", data: formData }),
      })
      toast.success("Offre validée")
      router.refresh()
      setOffre((prev) => (prev ? { ...prev, status: "validated" } : null))
    } catch (error) {
      toast.error("Erreur lors de la validation")
    } finally {
      setLoading(false)
    }
  }

  if (loading || !offre || !template || !client) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!Array.isArray(template.mapping_json)) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="p-6 max-w-md text-center">
          <p className="text-destructive">Template invalide : mapping_json manquant</p>
          <Link href="/offres">
            <Button className="mt-4">Retour aux offres</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/offres">
          <Button variant="ghost" size="icon" aria-label="Retour aux offres">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">Offre #{offre.id}</h1>
            <Badge
              variant={offre.status === "validated" ? "default" : "secondary"}
              className={offre.status === "validated" ? "bg-primary" : ""}
            >
              {offre.status === "draft" ? "Brouillon" : offre.status === "validated" ? "Validée" : "Téléchargée"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2">
            {client.company_name} - {template.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} variant="outline" disabled={loading || offre.status !== "draft"}>
            Enregistrer
          </Button>
          {offre.status === "draft" && (
            <Button onClick={handleValidate} disabled={loading} className="gap-2">
              <Check className="h-4 w-4" />
              Valider
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="edit" className="w-full">
        <TabsList>
          <TabsTrigger value="edit">Édition</TabsTrigger>
          <TabsTrigger value="preview">Aperçu PDF</TabsTrigger>
          <TabsTrigger value="versions">
            <History className="h-4 w-4 mr-2" />
            Versions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-6">
          <Card className="p-6">
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">Données de l'offre</h2>
              <div className="grid gap-6 md:grid-cols-2">
                {Array.isArray(template.mapping_json) &&
                  template.mapping_json.map((field) => (
                    <div key={field.field_name} className="space-y-2">
                      <Label htmlFor={field.field_name}>{field.field_name}</Label>
                      <Input
                        id={field.field_name}
                        type={field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : "text"}
                        value={formData[field.field_name] || ""}
                        onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.value })}
                        placeholder={field.placeholder}
                        disabled={offre.status !== "draft"}
                      />
                    </div>
                  ))}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          {offre.status === "validated" ? (
            <PDFPreview
              offreId={params.id}
              onDownload={() => {
                setOffre((prev) => (prev ? { ...prev, status: "downloaded" } : null))
              }}
            />
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">Validez l'offre pour générer l'aperçu PDF</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="versions">
          <VersionTimeline offreId={params.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
