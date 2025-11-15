import { z } from "zod"
import { templateContentSchema, validateTemplateContent } from "@/lib/templates/schema"

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
// Ce schéma est la source de vérité pour la validation côté backend et frontend
// 
// SÉCURITÉ : Ce schéma NE DOIT JAMAIS contenir org_id - il vient toujours de getCurrentOrgId()
// 
// NOTE : Ce schéma correspond exactement aux champs présents dans le schéma DB clients :
// - id (généré automatiquement)
// - org_id (vient de getCurrentOrgId(), jamais du client)
// - name, company, email, phone, tags, created_at, updated_at

// Schéma de base (sans transformations) - peut être étendu avec .extend()
export const baseClientSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  company_name: z.string().optional(), // Alias pour company (pour compatibilité API)
  company: z.string().optional(), // Champ DB réel
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Schéma avec transformations pour l'API
export const createClientSchema = baseClientSchema.refine(
  (data) => {
    // Soit company_name, soit company doit être fourni (ou les deux, on prend company en priorité)
    return true; // Pour l'instant, on accepte les deux ou aucun
  },
  { message: "Au moins un champ company ou company_name doit être fourni" }
).transform((data) => {
  // Normaliser : si company_name est fourni mais pas company, utiliser company_name
  if (data.company_name && !data.company) {
    return { ...data, company: data.company_name };
  }
  return data;
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
  content: z
    .string()
    .optional()
    .transform((val) => {
      // Normaliser le contenu : null/empty → JSON stringifié de { fields: [] }
      if (!val || val.trim() === "") {
        return JSON.stringify({ fields: [] });
      }
      return val;
    })
    .refine(
      (val) => {
        // Valider que le contenu est un JSON valide correspondant à TemplateContent
        const validated = validateTemplateContent(val);
        return validated !== null;
      },
      {
        message: "Le contenu doit être un JSON valide avec une structure { fields: [...] }",
      }
    )
    .transform((val) => {
      // Normaliser le JSON (réordonner les champs, supprimer les valeurs invalides)
      const validated = validateTemplateContent(val);
      if (validated) {
        return JSON.stringify(validated);
      }
      // Ne devrait jamais arriver ici car le refine a déjà validé
      return val;
    }),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type ClientFormData = z.infer<typeof clientSchema>
export type TemplateFormData = z.infer<typeof templateSchema>
export type OffreFormData = z.infer<typeof offreSchema>
export type CreateClientInput = z.infer<typeof createClientSchema>
export type CreateOfferInput = z.infer<typeof createOfferSchema>
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>
