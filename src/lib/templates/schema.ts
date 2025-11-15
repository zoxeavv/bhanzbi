import { z } from "zod"

/**
 * Schéma Zod pour valider un champ de template
 * 
 * Règles de validation :
 * - field_name est requis, non vide, et limité à 100 caractères max
 * - field_type doit être un des types supportés
 * - Si field_type = "select", options doit être un tableau non vide (max 50 options, 100 caractères par option)
 * - id est optionnel (généré côté client si absent)
 * 
 * Limites de performance/UX (validation côté serveur) :
 * - Nom de champ : 100 caractères max (évite les noms trop longs qui cassent l'UI et dégradent les performances)
 * - Options select : 50 max au niveau du tableau, 100 caractères par option (évite les selects géants qui ralentissent le rendu)
 * Ces limites protègent contre les abus et garantissent une expérience utilisateur fluide.
 */
export const templateFieldSchema = z.object({
  id: z.string().optional(),
  field_name: z.string()
    .min(1, "Le nom du champ est requis")
    .max(100, "Le nom du champ ne peut pas dépasser 100 caractères"),
  field_type: z.enum(["text", "number", "date", "select", "textarea"], {
    errorMap: () => ({ message: "Type de champ invalide" }),
  }),
  placeholder: z.string().optional(),
  required: z.boolean().optional().default(false),
  options: z.array(
    z.string()
      .min(1, "Une option ne peut pas être vide")
      .max(100, "Une option ne peut pas dépasser 100 caractères")
  )
    .max(50, "Un champ select ne peut pas avoir plus de 50 options")
    .optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
}).refine(
  (data) => {
    // Si le type est "select", options doit être défini et non vide
    if (data.field_type === "select") {
      return data.options !== undefined && data.options.length > 0;
    }
    return true;
  },
  {
    message: "Les champs de type 'select' doivent avoir au moins une option",
    path: ["options"],
  }
)

/**
 * Type TypeScript inféré du schéma Zod
 */
export type TemplateField = z.infer<typeof templateFieldSchema>

/**
 * Schéma Zod pour valider la structure complète du content d'un template
 * 
 * Structure attendue : { version: 1, fields: TemplateField[] }
 * 
 * Limites de performance/UX (validation côté serveur) :
 * - Nombre de champs : 50 max (évite les templates trop complexes qui dégradent les performances de rendu et de traitement)
 * Cette limite protège contre les abus et garantit une expérience utilisateur fluide même avec des templates complexes.
 */
export const templateContentSchema = z.object({
  version: z.number().int().positive().default(1),
  fields: z.array(templateFieldSchema)
    .max(50, "Un template ne peut pas contenir plus de 50 champs")
    .default([]),
})

/**
 * Type TypeScript inféré du schéma Zod
 */
export type TemplateContent = z.infer<typeof templateContentSchema>

/**
 * Valide qu'une chaîne JSON correspond au schéma TemplateContent
 * 
 * @param content - Chaîne JSON à valider
 * @returns Le contenu parsé et validé, ou null si invalide
 */
export function validateTemplateContent(content: string | null | undefined): TemplateContent | null {
  if (!content || content.trim() === "") {
    // Contenu vide ou null → retourner structure vide par défaut avec version
    return { version: 1, fields: [] };
  }

  try {
    const parsed = JSON.parse(content);
    
    // Backward compatibility: si pas de version, considérer comme version 1
    if (parsed && typeof parsed === 'object' && !('version' in parsed)) {
      parsed.version = 1;
    }
    
    const result = templateContentSchema.safeParse(parsed);
    
    if (result.success) {
      return result.data;
    }
    
    return null;
  } catch {
    // JSON invalide
    return null;
  }
}

