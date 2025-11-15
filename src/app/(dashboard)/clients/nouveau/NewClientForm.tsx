"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { ClientForm, type ClientFormData } from "@/components/clients/ClientForm"
import { toast } from "sonner"

export function NewClientForm() {
  const router = useRouter()

  const handleSubmit = async (data: ClientFormData) => {
    try {
      // Transformer les données pour l'API
      const apiData = {
        name: data.name,
        company: data.company,
        email: data.email || "",
        phone: data.phone || "",
        tags: data.tags || [],
      }

      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Si c'est une erreur de validation Zod, afficher tous les messages
        if (errorData.details && Array.isArray(errorData.details)) {
          const errorMessages = errorData.details
            .map((detail: { message?: string; path?: (string | number)[] }) => {
              const field = detail.path?.join(".") || "champ"
              return detail.message ? `${field}: ${detail.message}` : detail.message
            })
            .filter(Boolean)
            .join(", ")
          
          throw new Error(errorMessages || "Erreur de validation")
        }
        
        throw new Error(errorData.error || "Erreur lors de la création du client")
      }

      const client = await response.json()

      toast.success("Client créé avec succès")
      router.push(`/clients/${client.id}`)
      router.refresh()
    } catch (error) {
      // L'erreur sera gérée par le formulaire via setError
      throw error
    }
  }

  const handleCancel = () => {
    router.push("/clients")
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] py-8">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon" aria-label="Retour aux clients">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nouveau client</h1>
            <p className="text-muted-foreground mt-2">
              Ajoutez un nouveau client à votre portefeuille
            </p>
          </div>
        </div>

        {/* Formulaire dans une card centrée */}
        <Card>
          <CardHeader>
            <CardTitle>Informations du client</CardTitle>
            <CardDescription>
              Remplissez les informations pour créer un nouveau client
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClientForm onSubmit={handleSubmit} onCancel={handleCancel} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

