"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Building2, User, Mail, Phone, Tag } from "lucide-react"

// Schéma de validation pour le formulaire
const clientFormSchema = z.object({
  name: z.string().min(1, "Le nom du contact est requis").min(2, "Le nom doit contenir au moins 2 caractères"),
  company: z.string().min(1, "Le nom de l'entreprise est requis").min(2, "Le nom de l'entreprise doit contenir au moins 2 caractères"),
  email: z
    .string()
    .optional()
    .refine((val) => !val || val === "" || z.string().email().safeParse(val).success, {
      message: "Email invalide",
    }),
  phone: z.string().optional(),
  tags: z
    .string()
    .optional()
    .transform((val) => {
      if (!val || val.trim() === "") return []
      // Séparer par virgule ou pipe et nettoyer
      return val
        .split(/[,|]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    }),
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
      if (error instanceof Error) {
        setError("root", {
          type: "manual",
          message: error.message,
        })
      } else {
        setError("root", {
          type: "manual",
          message: "Une erreur est survenue lors de la création du client",
        })
      }
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

