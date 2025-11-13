"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ArrowRight } from "lucide-react"
import Link from "next/link"
import type { Client, Template } from "@/lib/types"

export default function NewOffrePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [clients, setClients] = useState<Client[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedClient, setSelectedClient] = useState(searchParams.get("client") || "")
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log("[v0] NewOffrePage mounted, loading data...")

    async function loadData() {
      try {
        console.log("[v0] Fetching clients and templates...")

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

        const [clientsRes, templatesRes] = await Promise.all([
          fetch("/api/clients", { signal: controller.signal }),
          fetch("/api/templates", { signal: controller.signal }),
        ])

        clearTimeout(timeoutId)
        console.log("[v0] Fetch completed, status:", clientsRes.status, templatesRes.status)

        if (!clientsRes.ok || !templatesRes.ok) {
          throw new Error("Failed to fetch data")
        }

        const clientsData = await clientsRes.json()
        const templatesData = await templatesRes.json()

        console.log("[v0] Data received:", {
          clientsCount: clientsData?.length,
          templatesCount: templatesData?.length,
        })

        const validClients = Array.isArray(clientsData) ? clientsData : []
        const validTemplates = Array.isArray(templatesData) ? templatesData : []

        setClients(validClients)
        setTemplates(validTemplates)
        setError(null)
      } catch (err) {
        console.error("[v0] Error loading data:", err)
        if (err instanceof Error && err.name === "AbortError") {
          setError("Le chargement a pris trop de temps. Veuillez réessayer.")
        } else {
          setError("Erreur lors du chargement des données")
        }
        setClients([])
        setTemplates([])
      } finally {
        console.log("[v0] Setting loading to false")
        setLoading(false)
      }
    }

    loadData()
  }, []) // Empty dependency array to run only once

  async function handleCreate() {
    console.log("[v0] Creating offre with:", { selectedClient, selectedTemplate })
    setLoading(true)

    try {
      const response = await fetch("/api/offres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: selectedClient,
          template_id: selectedTemplate,
          status: "draft",
          data: {},
        }),
      })

      if (response.ok) {
        const offre = await response.json()
        console.log("[v0] Offre created:", offre.id)
        router.push(`/offres/${offre.id}`)
        router.refresh()
      } else {
        throw new Error("Failed to create offre")
      }
    } catch (err) {
      console.error("[v0] Error creating offre:", err)
      setError("Erreur lors de la création de l'offre")
      setLoading(false)
    }
  }

  console.log("[v0] Render state:", { loading, error, clientsCount: clients.length, templatesCount: templates.length })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-6 max-w-md">
          <p className="text-destructive text-center">{error}</p>
          <Button onClick={() => window.location.reload()} className="w-full mt-4">
            Réessayer
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/offres">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Nouvelle offre</h1>
          <p className="text-muted-foreground mt-2">Étape {step} sur 2</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-2">
        <div className={`h-2 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-secondary"}`} />
        <div className={`h-2 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-secondary"}`} />
      </div>

      {/* Step 1: Select Client */}
      {step === 1 && (
        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Sélectionnez un client</h2>
              <p className="text-sm text-muted-foreground">Pour qui créez-vous cette offre ?</p>
            </div>

            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.length > 0 ? (
                    clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company_name} - {client.contact_name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Aucun client disponible</div>
                  )}
                </SelectContent>
              </Select>
              {clients.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  <Link href="/clients/nouveau" className="text-primary hover:underline">
                    Créer un nouveau client
                  </Link>
                </p>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Link href="/offres" className="flex-1">
                <Button type="button" variant="outline" className="w-full bg-transparent">
                  Annuler
                </Button>
              </Link>
              <Button onClick={() => setStep(2)} disabled={!selectedClient} className="flex-1 gap-2">
                Suivant
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Select Template */}
      {step === 2 && (
        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Sélectionnez un template</h2>
              <p className="text-sm text-muted-foreground">Quel modèle souhaitez-vous utiliser ?</p>
            </div>

            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.length > 0 ? (
                    templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({Array.isArray(template.mapping_json) ? template.mapping_json.length : 0}{" "}
                        champs)
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Aucun template disponible</div>
                  )}
                </SelectContent>
              </Select>
              {templates.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  <Link href="/templates/nouveau" className="text-primary hover:underline">
                    Créer un nouveau template
                  </Link>
                </p>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                Retour
              </Button>
              <Button onClick={handleCreate} disabled={!selectedTemplate || loading} className="flex-1">
                {loading ? "Création..." : "Créer l'offre"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
