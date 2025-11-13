"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { clientSchema, type ClientFormData } from "@/lib/validations"
import { toast } from "sonner"

export default function NewClientPage() {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
  })

  async function onSubmit(data: ClientFormData) {
    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast.success("Client créé avec succès")
        router.push("/clients")
        router.refresh()
      } else {
        toast.error("Erreur lors de la création du client")
      }
    } catch (error) {
      toast.error("Une erreur est survenue")
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/clients">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Nouveau client</h1>
          <p className="text-muted-foreground mt-2">Ajoutez un nouveau client à votre portefeuille</p>
        </div>
      </div>

      {/* Form */}
      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="company_name">Nom de l'entreprise</Label>
            <Input id="company_name" {...register("company_name")} placeholder="Ex: TechCorp Solutions" />
            {errors.company_name && <p className="text-sm text-destructive">{errors.company_name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_name">Nom du contact</Label>
            <Input id="contact_name" {...register("contact_name")} placeholder="Ex: Marie Dubois" />
            {errors.contact_name && <p className="text-sm text-destructive">{errors.contact_name.message}</p>}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="contact@entreprise.fr" />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" {...register("phone")} placeholder="+33 1 23 45 67 89" />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secteur">Secteur d'activité</Label>
            <Input id="secteur" {...register("secteur")} placeholder="Ex: Technologie, Finance, Commerce..." />
            {errors.secteur && <p className="text-sm text-destructive">{errors.secteur.message}</p>}
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Création..." : "Créer le client"}
            </Button>
            <Link href="/clients" className="flex-1">
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
