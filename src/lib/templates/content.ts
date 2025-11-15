import type { TemplateField } from "./schema"
import { templateContentSchema } from "./schema"

/**
 * Parse le champ content d'un template (JSON string) en tableau de TemplateField
 * 
 * @param raw - Chaîne JSON représentant { version: 1, fields: [...] } ou { fields: [...] } (backward compat)
 * @returns Tableau de TemplateField, ou tableau vide si parsing/validation échoue
 * 
 * @example
 * ```ts
 * const fields = parseTemplateContent('{"version": 1, "fields": [{"field_name": "poste", "field_type": "text"}]}')
 * // Ou avec backward compat:
 * const fields = parseTemplateContent('{"fields": [{"field_name": "poste", "field_type": "text"}]}')
 * ```
 * 
 * @remarks
 * Cette fonction est stricte : si le contenu ne correspond pas exactement au schéma TemplateContent,
 * elle retourne un tableau vide plutôt que d'essayer de "réparer" les données invalides.
 * Les appels doivent vérifier si le tableau est vide pour détecter les erreurs de parsing.
 * 
 * Backward compatibility: Si le JSON n'a pas de champ "version", il est considéré comme version 1.
 */
export function parseTemplateContent(raw: string | null | undefined): TemplateField[] {
  if (!raw || raw.trim() === "") {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    
    // Backward compatibility: si pas de version, considérer comme version 1
    if (parsed && typeof parsed === 'object' && !('version' in parsed)) {
      parsed.version = 1
    }
    
    // Valider strictement avec le schéma Zod
    const result = templateContentSchema.safeParse(parsed)
    
    if (result.success) {
      return result.data.fields
    }

    // Validation échouée : logger l'erreur et retourner un tableau vide
    // Ne pas essayer de "réparer" les données invalides pour éviter de masquer des erreurs réelles
    console.error("[parseTemplateContent] Structure invalide, validation échouée:", {
      error: result.error,
      parsed,
      message: "Le contenu ne correspond pas au schéma TemplateContent. Retour d'un tableau vide.",
    })
    
    return []
  } catch (error) {
    // Erreur de parsing JSON (JSON malformé)
    console.error("[parseTemplateContent] Erreur lors du parsing JSON:", error)
    return []
  }
}

/**
 * Sérialise un tableau de TemplateField en JSON string pour le champ content
 * 
 * @param fields - Tableau de TemplateField à sérialiser
 * @returns Chaîne JSON représentant { version: 1, fields: [...] }
 * 
 * @example
 * ```ts
 * const json = serializeTemplateContent([
 *   { field_name: "poste", field_type: "text", required: true }
 * ])
 * // Retourne: '{"version":1,"fields":[{"field_name":"poste","field_type":"text","required":true}]}'
 * ```
 */
export function serializeTemplateContent(fields: TemplateField[]): string {
  return JSON.stringify({ version: 1, fields })
}

