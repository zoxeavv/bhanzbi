"use server"

import { getCurrentOrgId } from "@/lib/auth/session"
import { requireAdmin } from "@/lib/auth/permissions"
import { getTemplateById, createTemplate, updateTemplate, getTemplateBySlug } from "@/lib/db/queries/templates"
import { createTemplateSchema } from "@/lib/validations"
import { validateTemplateContent } from "@/lib/templates/schema"
import type { Template } from "@/types/domain"
import { z } from "zod"
import type { TemplateErrorCode } from "@/lib/templates/errors"
import { getUserMessage } from "@/lib/templates/errors"

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

export type DuplicateTemplateResult = 
  | { success: true; template: Template }
  | { success: false; code: TemplateErrorCode; message: string }

export type UpdateTemplateResult = 
  | { ok: true; template: Template }
  | { ok: false; code: TemplateErrorCode; message: string }

export type ResetTemplateStructureResult = 
  | { ok: true; template: Template }
  | { ok: false; code: TemplateErrorCode; message: string }

/**
 * Server Action pour dupliquer un template
 * 
 * @param templateId - ID du template à dupliquer
 * @returns Le nouveau template créé ou une erreur
 */
export async function duplicateTemplate(templateId: string): Promise<DuplicateTemplateResult> {
  try {
    // Vérifier les permissions ADMIN avant toute opération
    await requireAdmin()
    
    // Récupérer l'orgId côté serveur (jamais exposé au client)
    const orgId = await getCurrentOrgId()
    
    // Charger le template source - getTemplateById lance une erreur si non trouvé
    let sourceTemplate: Template
    try {
      sourceTemplate = await getTemplateById(templateId, orgId)
    } catch (error) {
      // Si le template n'existe pas, retourner un code spécifique
      if (error instanceof Error && error.message.includes('not found')) {
        console.error('[duplicateTemplate] Template not found:', templateId)
        return {
          success: false,
          code: 'TEMPLATE_NOT_FOUND',
          message: getUserMessage('TEMPLATE_NOT_FOUND', 'Le template à dupliquer n\'existe plus ou a été supprimé.')
        }
      }
      // Re-lancer l'erreur si ce n'est pas une erreur "not found"
      throw error
    }
    
    // Générer un titre et un slug pour la copie
    const newTitle = `${sourceTemplate.title} (copie)`
    const baseSlug = sourceTemplate.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
    const slugWithSuffix = `${baseSlug}-copie-${Date.now()}`
    
    // Vérifier explicitement si le slug existe déjà dans l'organisation
    const existingTemplate = await getTemplateBySlug(slugWithSuffix, orgId)
    if (existingTemplate) {
      // Si collision, générer un slug alternatif automatiquement
      console.log(`[duplicateTemplate] Slug "${slugWithSuffix}" déjà pris, génération d'un slug alternatif`)
    }
    
    // Vérifier l'unicité du slug et générer un slug alternatif si nécessaire
    const uniqueSlug = await ensureUniqueSlug(slugWithSuffix, orgId)
    
    // Valider les données avec le schéma Zod existant
    const validatedData = createTemplateSchema.parse({
      title: newTitle,
      slug: uniqueSlug,
      content: sourceTemplate.content,
      category: sourceTemplate.category,
      tags: sourceTemplate.tags,
    })
    
    // Créer le nouveau template via la couche DB
    const newTemplate = await createTemplate({
      orgId,
      title: validatedData.title,
      slug: validatedData.slug,
      content: validatedData.content,
      category: validatedData.category,
      tags: validatedData.tags,
    })
    
    return { success: true, template: newTemplate }
  } catch (error) {
    // Gérer les erreurs de validation Zod
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      console.error('[duplicateTemplate] Validation error:', error.errors)
      return { 
        success: false, 
        code: 'VALIDATION_ERROR',
        message: firstError?.message || getUserMessage('VALIDATION_ERROR')
      }
    }
    
    if (error instanceof Error) {
      // Erreur d'authentification
      if (error.message === 'Unauthorized' || error.message.includes('Organization ID')) {
        console.error('[duplicateTemplate] Unauthorized:', error)
        return { 
          success: false, 
          code: 'UNAUTHORIZED',
          message: getUserMessage('UNAUTHORIZED')
        }
      }
      
      // Erreur "not found" (fallback si pas déjà gérée)
      if (error.message.includes('not found')) {
        console.error('[duplicateTemplate] Template not found (fallback):', templateId)
        return { 
          success: false, 
          code: 'TEMPLATE_NOT_FOUND',
          message: getUserMessage('TEMPLATE_NOT_FOUND', 'Le template à dupliquer n\'existe plus ou a été supprimé.')
        }
      }
      
      // Erreur de slug dupliqué (même après vérification, peut arriver en cas de race condition)
      if (error.message.includes('existe déjà') || error.message.includes('duplicate') || error.message.includes('unique')) {
        console.error('[duplicateTemplate] Slug conflict (race condition):', error)
        return { 
          success: false, 
          code: 'SLUG_TAKEN',
          message: getUserMessage('SLUG_TAKEN', 'Impossible de créer une copie : un template avec ce nom existe déjà. Veuillez réessayer.')
        }
      }
      
      // Autres erreurs
      console.error('[duplicateTemplate] Error:', error)
      return { 
        success: false, 
        code: 'UNKNOWN_ERROR',
        message: error.message || getUserMessage('UNKNOWN_ERROR')
      }
    }
    
    // Erreur inconnue
    console.error('[duplicateTemplate] Unknown error:', error)
    return { 
      success: false, 
      code: 'UNKNOWN_ERROR',
      message: getUserMessage('UNKNOWN_ERROR')
    }
  }
}

/**
 * Server Action pour mettre à jour un template
 * 
 * @param templateId - ID du template à mettre à jour
 * @param payload - Données à mettre à jour (title, content, category, tags)
 * @returns Le template mis à jour ou une erreur
 */
export async function updateTemplateAction(
  templateId: string,
  payload: {
    title?: string
    content?: string
    category?: string
    tags?: string[]
  }
): Promise<UpdateTemplateResult> {
  try {
    // Vérifier les permissions ADMIN avant toute opération
    await requireAdmin()
    
    // Récupérer l'orgId côté serveur (jamais exposé au client)
    const orgId = await getCurrentOrgId()
    
    // Vérifier que le template existe et appartient à l'organisation
    await getTemplateById(templateId, orgId)
    
    // Préparer les données à mettre à jour
    const updateData: {
      title?: string
      content?: string
      category?: string
      tags?: string[]
    } = {}
    
    // Valider et normaliser le content si présent
    if (payload.content !== undefined) {
      const validatedContent = validateTemplateContent(payload.content)
      
      if (validatedContent === null) {
        console.error('[updateTemplateAction] Invalid content structure:', {
          templateId,
          content: payload.content,
        })
        return { 
          ok: false, 
          code: 'INVALID_CONTENT_STRUCTURE',
          message: 'Structure de contenu invalide. Le contenu doit être un JSON valide avec une structure { fields: [...] }'
        }
      }
      
      // Normaliser le contenu validé (réordonner, nettoyer)
      updateData.content = JSON.stringify(validatedContent)
    }
    
    // Valider les autres champs avec le schéma partiel
    if (payload.title !== undefined || payload.category !== undefined || payload.tags !== undefined) {
      const partialSchema = createTemplateSchema.partial()
      const validatedData = partialSchema.parse({
        title: payload.title,
        category: payload.category,
        tags: payload.tags,
      })
      
      if (validatedData.title !== undefined) updateData.title = validatedData.title
      if (validatedData.category !== undefined) updateData.category = validatedData.category
      if (validatedData.tags !== undefined) updateData.tags = validatedData.tags
    }
    
    // Mettre à jour le template via la couche DB
    const updatedTemplate = await updateTemplate(templateId, orgId, updateData)
    
    return { ok: true, template: updatedTemplate }
  } catch (error) {
    // Gérer les erreurs de validation Zod
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      console.error('[updateTemplateAction] Validation error:', error.errors)
      return { 
        ok: false, 
        code: 'VALIDATION_ERROR',
        message: firstError?.message || getUserMessage('VALIDATION_ERROR')
      }
    }
    
    if (error instanceof Error) {
      // Erreur d'authentification
      if (error.message === 'Unauthorized' || error.message.includes('Organization ID')) {
        console.error('[updateTemplateAction] Unauthorized:', error)
        return { 
          ok: false, 
          code: 'UNAUTHORIZED',
          message: getUserMessage('UNAUTHORIZED')
        }
      }
      
      // Erreur "not found"
      if (error.message.includes('not found')) {
        console.error('[updateTemplateAction] Template not found:', templateId)
        return { 
          ok: false, 
          code: 'TEMPLATE_NOT_FOUND',
          message: getUserMessage('TEMPLATE_NOT_FOUND')
        }
      }
      
      // Autres erreurs
      console.error('[updateTemplateAction] Error:', error)
      return { 
        ok: false, 
        code: 'UNKNOWN_ERROR',
        message: error.message || getUserMessage('UNKNOWN_ERROR')
      }
    }
    
    // Erreur inconnue
    console.error('[updateTemplateAction] Unknown error:', error)
    return { 
      ok: false, 
      code: 'UNKNOWN_ERROR',
      message: getUserMessage('UNKNOWN_ERROR')
    }
  }
}

/**
 * Server Action pour réinitialiser la structure d'un template
 * 
 * @param templateId - ID du template à réinitialiser
 * @returns Le template mis à jour avec une structure vide ou une erreur
 */
export async function resetTemplateStructure(templateId: string): Promise<ResetTemplateStructureResult> {
  try {
    // Vérifier les permissions ADMIN avant toute opération
    await requireAdmin()
    
    // Récupérer l'orgId côté serveur (jamais exposé au client)
    const orgId = await getCurrentOrgId()
    
    // Vérifier que le template existe et appartient à l'organisation
    await getTemplateById(templateId, orgId)
    
    // Créer une structure vide
    const emptyContent = JSON.stringify({ fields: [] })
    
    // Mettre à jour le template avec la structure vide
    const updatedTemplate = await updateTemplate(templateId, orgId, {
      content: emptyContent,
    })
    
    return { ok: true, template: updatedTemplate }
  } catch (error) {
    if (error instanceof Error) {
      // Erreur d'authentification
      if (error.message === 'Unauthorized' || error.message.includes('Organization ID')) {
        console.error('[resetTemplateStructure] Unauthorized:', error)
        return { 
          ok: false, 
          code: 'UNAUTHORIZED',
          message: getUserMessage('UNAUTHORIZED')
        }
      }
      
      // Erreur "not found"
      if (error.message.includes('not found')) {
        console.error('[resetTemplateStructure] Template not found:', templateId)
        return { 
          ok: false, 
          code: 'TEMPLATE_NOT_FOUND',
          message: getUserMessage('TEMPLATE_NOT_FOUND')
        }
      }
      
      // Autres erreurs
      console.error('[resetTemplateStructure] Error:', error)
      return { 
        ok: false, 
        code: 'UNKNOWN_ERROR',
        message: error.message || getUserMessage('UNKNOWN_ERROR')
      }
    }
    
    // Erreur inconnue
    console.error('[resetTemplateStructure] Unknown error:', error)
    return { 
      ok: false, 
      code: 'UNKNOWN_ERROR',
      message: getUserMessage('UNKNOWN_ERROR')
    }
  }
}

