"use server"

import { getCurrentOrgId } from "@/lib/auth/session"
import { requireAdmin } from "@/lib/auth/permissions"
import { createTemplate, getTemplateBySlug } from "@/lib/db/queries/templates"
import { createTemplateSchema } from "@/lib/validations"
import type { Template, TemplateKind } from "@/types/domain"
import { z } from "zod"
import type { TemplateErrorCode } from "@/lib/templates/errors"
import { getUserMessage } from "@/lib/templates/errors"
import { getTemplateConfig } from "@/lib/templates/config"
import { parseTemplateContent, serializeTemplateContent } from "@/lib/templates/content"
import type { TemplateField } from "@/lib/templates/schema"

/**
 * Génère un slug unique en vérifiant l'existence dans l'organisation
 * Si le slug existe déjà, génère une variante avec un timestamp
 * 
 * @param baseSlug - Slug de base à utiliser
 * @param orgId - ID de l'organisation
 * @returns Un slug unique pour l'organisation
 */
async function ensureUniqueSlug(baseSlug: string, orgId: string): Promise<string> {
  // Vérifier si le slug existe déjà
  const existing = await getTemplateBySlug(baseSlug, orgId)
  
  if (!existing) {
    return baseSlug
  }
  
  // Générer un slug alternatif avec timestamp
  const timestamp = Date.now()
  const uniqueSlug = `${baseSlug}-${timestamp}`
  
  // Vérifier que le slug alternatif n'existe pas non plus (cas très rare)
  const existingAlt = await getTemplateBySlug(uniqueSlug, orgId)
  if (existingAlt) {
    // Si même le slug avec timestamp existe (quasi impossible), ajouter un random
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    return `${baseSlug}-${timestamp}-${randomSuffix}`
  }
  
  return uniqueSlug
}

export type CreateTemplateResult = 
  | { success: true; template: Template }
  | { success: false; code: TemplateErrorCode; message: string }

/**
 * Enrichit les fields avec meta.businessKey à partir de templateConfigs si possible
 * 
 * @param fields - Les champs à enrichir
 * @param templateKind - Le type de template
 * @returns Les champs enrichis avec meta.businessKey si un match est trouvé
 */
function enrichFieldsWithBusinessKeys(
  fields: TemplateField[],
  templateKind: TemplateKind
): TemplateField[] {
  const config = getTemplateConfig(templateKind)
  
  // Si pas de placeholders dans la config, retourner les fields tels quels
  if (!config.placeholders || Object.keys(config.placeholders).length === 0) {
    return fields
  }

  return fields.map((field) => {
    // Si le field a déjà un businessKey, ne pas le modifier
    if (field.meta?.businessKey) {
      return field
    }

    // Chercher un match dans les placeholders de la config
    // 1. Chercher par placeholderRaw si présent
    if (field.meta?.placeholderRaw && typeof field.meta.placeholderRaw === 'string') {
      const placeholderConfig = config.placeholders[field.meta.placeholderRaw]
      if (placeholderConfig) {
        return {
          ...field,
          meta: {
            ...field.meta,
            businessKey: placeholderConfig.businessKey,
          },
        }
      }
    }

    // 2. Chercher par field_name (ex: "poste" pourrait matcher "{{poste}}")
    const placeholderKey = `{{${field.field_name}}}`
    const placeholderConfig = config.placeholders[placeholderKey]
    if (placeholderConfig) {
      return {
        ...field,
        meta: {
          ...(field.meta || {}),
          placeholderRaw: placeholderKey, // Ajouter le placeholderRaw si absent
          businessKey: placeholderConfig.businessKey,
        },
      }
    }

    // Aucun match trouvé, retourner le field tel quel
    return field
  })
}

/**
 * Server Action pour créer un template à partir de données parsées d'un fichier .docx
 * 
 * @param data - Données du template (title, slug, content, template_kind, category, tags)
 * @returns Le template créé ou une erreur
 */
export async function createTemplateFromParsedDocx(data: {
  title: string
  slug: string
  content: string
  template_kind?: TemplateKind
  category?: string
  tags?: string[]
}): Promise<CreateTemplateResult> {
  try {
    // Vérifier les permissions ADMIN avant toute opération
    await requireAdmin()
    
    // Récupérer l'orgId côté serveur (jamais exposé au client)
    const orgId = await getCurrentOrgId()
    
    // Vérifier explicitement si le slug existe déjà dans l'organisation
    const existingTemplate = await getTemplateBySlug(data.slug, orgId)
    if (existingTemplate) {
      // Pour l'upload de fichier, on génère automatiquement un slug alternatif
      // pour éviter les collisions de manière transparente
      console.log(`[createTemplateFromParsedDocx] Slug "${data.slug}" déjà pris, génération d'un slug alternatif`)
    }
    
    // Vérifier l'unicité du slug et générer un slug alternatif si nécessaire
    const uniqueSlug = await ensureUniqueSlug(data.slug, orgId)
    
    // Parser le content pour enrichir les fields avec meta.businessKey si template_kind !== GENERIC
    const templateKind = data.template_kind ?? 'GENERIC'
    let enrichedContent = data.content
    
    if (templateKind !== 'GENERIC') {
      try {
        const fields = parseTemplateContent(data.content)
        const enrichedFields = enrichFieldsWithBusinessKeys(fields, templateKind)
        enrichedContent = serializeTemplateContent(enrichedFields)
      } catch (error) {
        // Si le parsing échoue, utiliser le content original
        console.warn('[createTemplateFromParsedDocx] Failed to enrich fields with business keys:', error)
      }
    }
    
    // Valider les données avec le schéma Zod existant
    const validatedData = createTemplateSchema.parse({
      title: data.title,
      slug: uniqueSlug,
      content: enrichedContent,
      category: data.category ?? "",
      tags: data.tags ?? [],
    })
    
    // Créer le template via la couche DB
    const template = await createTemplate({
      orgId,
      title: validatedData.title,
      slug: validatedData.slug,
      content: validatedData.content,
      template_kind: templateKind,
      category: validatedData.category,
      tags: validatedData.tags,
    })
    
    return { success: true, template }
  } catch (error) {
    // Gérer les erreurs de validation Zod
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      console.error('[createTemplateFromParsedDocx] Validation error:', error.errors)
      return { 
        success: false, 
        code: 'VALIDATION_ERROR',
        message: firstError?.message || getUserMessage('VALIDATION_ERROR')
      }
    }
    
    if (error instanceof Error) {
      // Erreur d'authentification
      if (error.message === 'Unauthorized' || error.message.includes('Organization ID')) {
        console.error('[createTemplateFromParsedDocx] Unauthorized:', error)
        return { 
          success: false, 
          code: 'UNAUTHORIZED',
          message: getUserMessage('UNAUTHORIZED')
        }
      }
      
      // Erreur de slug dupliqué (même après vérification, peut arriver en cas de race condition)
      if (error.message.includes('existe déjà') || error.message.includes('duplicate') || error.message.includes('unique')) {
        console.error('[createTemplateFromParsedDocx] Slug conflict (race condition):', error)
        return { 
          success: false, 
          code: 'SLUG_TAKEN',
          message: getUserMessage('SLUG_TAKEN', 'Un template avec ce nom existe déjà dans votre organisation. Veuillez utiliser un nom de fichier différent.')
        }
      }
      
      // Autres erreurs
      console.error('[createTemplateFromParsedDocx] Error:', error)
      return { 
        success: false, 
        code: 'UNKNOWN_ERROR',
        message: error.message || getUserMessage('UNKNOWN_ERROR')
      }
    }
    
    // Erreur inconnue
    console.error('[createTemplateFromParsedDocx] Unknown error:', error)
    return { 
      success: false, 
      code: 'UNKNOWN_ERROR',
      message: getUserMessage('UNKNOWN_ERROR')
    }
  }
}

