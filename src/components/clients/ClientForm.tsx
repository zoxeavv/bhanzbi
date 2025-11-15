"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Building2, User, Mail, Phone, Tag } from "lucide-react"
import { parseTags } from "@/lib/utils/tags"
import { baseClientSchema } from "@/lib/validations"
import { handleClientError } from "@/lib/utils/error-handling"

// Schéma de validation pour le formulaire (basé sur baseClientSchema avec transformation des tags)
const clientFormSchema = baseClientSchema.extend({
  tags: z
    .string()
    .optional()
    .transform((val) => parseTags(val || "")),
})

export type ClientFormData = z.infer<typeof clientFormSchema>

interface ClientFormProps {
  onSubmit: (data: ClientFormData) => Promise<void>
  onCancel?: () => void
  defaultValues?: Partial<ClientFormData>
  isSubmitting?: boolean
  submitLabel?: string
  cancelLabel?: string
  className?: string
}

export function ClientForm({
  onSubmit,
  onCancel,
  defaultValues,
  isSubmitting = false,
  submitLabel = "Créer le client",
  cancelLabel = "Annuler",
  className,
}: ClientFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: defaultValues || {
      name: "",
      company: "",
      email: "",
      phone: "",
      tags: "",
    },
  })

  const handleFormSubmit = async (data: ClientFormData) => {
    try {
      await onSubmit(data)
    } catch (error) {
      // Gestion d'erreurs générales
      const errorMessage = handleClientError(error, "submitClientForm")
      setError("root", {
        type: "manual",
        message: errorMessage,
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className={cn("space-y-6", className)}>
      {/* Erreur générale */}
      {errors.root && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">{errors.root.message}</p>
        </div>
      )}

      {/* Nom du contact */}
      <div className="space-y-2">
        <Label htmlFor="name" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Nom du contact <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="Ex: Marie Dubois"
          className={cn(errors.name && "border-destructive")}
          aria-invalid={errors.name ? "true" : "false"}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Nom de l'entreprise */}
      <div className="space-y-2">
        <Label htmlFor="company" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Nom de l'entreprise <span className="text-destructive">*</span>
        </Label>
        <Input
          id="company"
          {...register("company")}
          placeholder="Ex: TechCorp Solutions"
          className={cn(errors.company && "border-destructive")}
          aria-invalid={errors.company ? "true" : "false"}
          aria-describedby={errors.company ? "company-error" : undefined}
        />
        {errors.company && (
          <p id="company-error" className="text-sm text-destructive">
            {errors.company.message}
          </p>
        )}
      </div>

      {/* Email et Téléphone */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            placeholder="contact@entreprise.fr"
            className={cn(errors.email && "border-destructive")}
            aria-invalid={errors.email ? "true" : "false"}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p id="email-error" className="text-sm text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Téléphone
          </Label>
          <Input
            id="phone"
            type="tel"
            {...register("phone")}
            placeholder="+33 1 23 45 67 89"
            className={cn(errors.phone && "border-destructive")}
            aria-invalid={errors.phone ? "true" : "false"}
            aria-describedby={errors.phone ? "phone-error" : undefined}
          />
          {errors.phone && (
            <p id="phone-error" className="text-sm text-destructive">
              {errors.phone.message}
            </p>
          )}
        </div>
      </div>

      {/* Secteurs d'activité (tags) */}
      <div className="space-y-2">
        <Label htmlFor="tags" className="flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Secteurs d'activité
        </Label>
        <Input
          id="tags"
          {...register("tags")}
          placeholder="Ex: Technologie, Finance, Commerce (séparés par des virgules)"
          className={cn(errors.tags && "border-destructive")}
          aria-invalid={errors.tags ? "true" : "false"}
          aria-describedby={errors.tags ? "tags-error" : undefined}
        />
        {errors.tags && (
          <p id="tags-error" className="text-sm text-destructive">
            {errors.tags.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Séparez les secteurs par des virgules ou des pipes (|)
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row gap-4 pt-4">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} className="sm:flex-1">
            {cancelLabel}
          </Button>
        ) : (
          <Button type="button" variant="outline" className="sm:flex-1" disabled>
            {cancelLabel}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting} className="sm:flex-1">
          {isSubmitting ? "Création en cours..." : submitLabel}
        </Button>
      </div>
    </form>
  )
}

