import { z } from "zod"

export const clientSchema = z.object({
  company_name: z.string().min(2, "Le nom de l'entreprise doit contenir au moins 2 caractères"),
  contact_name: z.string().min(2, "Le nom du contact doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(10, "Numéro de téléphone invalide"),
  secteur: z.string().min(2, "Le secteur doit contenir au moins 2 caractères"),
})

export const templateSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  file_path: z.string().min(1, "Le fichier est requis"),
})

export const offreSchema = z.object({
  template_id: z.string().min(1, "Sélectionnez un template"),
  client_id: z.string().min(1, "Sélectionnez un client"),
  data: z.record(z.any()),
})

export type ClientFormData = z.infer<typeof clientSchema>
export type TemplateFormData = z.infer<typeof templateSchema>
export type OffreFormData = z.infer<typeof offreSchema>
