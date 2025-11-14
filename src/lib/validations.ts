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

// Schema for API client creation/update (matches Drizzle schema)
export const createClientSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  company: z.string().optional(),
  email: z.union([
    z.string().email("Email invalide"),
    z.literal(""),
  ]).optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Schema for API offer creation (matches Drizzle schema)
export const createOfferSchema = z.object({
  client_id: z.string().min(1, "Le client est requis"),
  template_id: z.string().optional().nullable(),
  title: z.string().min(1, "Le titre est requis"),
  items: z.array(z.object({
    id: z.string(),
    description: z.string(),
    quantity: z.number().min(0),
    unit_price: z.number().min(0), // in centimes
    total: z.number().min(0), // in centimes
  })),
  subtotal: z.number().min(0), // in centimes
  tax_rate: z.number().min(0).max(100), // 0-100
  tax_amount: z.number().min(0), // in centimes
  total: z.number().min(0), // in centimes
  status: z.enum(['draft', 'sent', 'accepted', 'rejected']).optional(),
});

// Schema for API template creation (matches Drizzle schema)
export const createTemplateSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  slug: z.string().min(1, "Le slug est requis"),
  content: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type ClientFormData = z.infer<typeof clientSchema>
export type TemplateFormData = z.infer<typeof templateSchema>
export type OffreFormData = z.infer<typeof offreSchema>
export type CreateClientInput = z.infer<typeof createClientSchema>
export type CreateOfferInput = z.infer<typeof createOfferSchema>
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>
