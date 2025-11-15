import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../index';
import { templates } from '../schema';
import type { Template } from '@/types/domain';
import { firstOrError, normalizeArray, normalizeString } from '../utils';

export async function listTemplates(orgId: string): Promise<Template[]> {
  if (!orgId) throw new Error('orgId is required');
  const results = await db.select()
    .from(templates)
    .where(eq(templates.org_id, orgId))
    .orderBy(desc(templates.created_at));
  
  return results.map((row) => ({
    id: row.id,
    title: normalizeString(row.title),
    slug: normalizeString(row.slug),
    content: normalizeString(row.content),
    template_kind: (normalizeString(row.template_kind) || 'GENERIC') as Template['template_kind'],
    category: normalizeString(row.category),
    tags: normalizeArray(row.tags),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }));
}

export async function getTemplateById(id: string, orgId: string): Promise<Template> {
  if (!orgId) throw new Error('orgId is required');
  const result = await db.select()
    .from(templates)
    .where(and(eq(templates.id, id), eq(templates.org_id, orgId)))
    .limit(1);
  const row = firstOrError(result[0], `Template not found: ${id}`);
  
  return {
    id: row.id,
    title: normalizeString(row.title),
    slug: normalizeString(row.slug),
    content: normalizeString(row.content),
    template_kind: (normalizeString(row.template_kind) || 'GENERIC') as Template['template_kind'],
    category: normalizeString(row.category),
    tags: normalizeArray(row.tags),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

/**
 * Récupère un template par son slug au sein d'une organisation
 * 
 * @param slug - Slug du template à rechercher
 * @param orgId - ID de l'organisation (requis pour isolation multi-tenant)
 * @returns Le template trouvé ou null si aucun template avec ce slug n'existe dans l'organisation
 * 
 * @remarks
 * Cette fonction garantit l'unicité du slug au sein d'une organisation (org_id, slug).
 * La contrainte DB unique composite (org_id, slug) garantit l'unicité au niveau organisationnel,
 * alignée avec la logique multi-tenant de l'application.
 */
export async function getTemplateBySlug(slug: string, orgId: string): Promise<Template | null> {
  if (!orgId) throw new Error('orgId is required');
  const result = await db.select()
    .from(templates)
    .where(and(eq(templates.slug, slug), eq(templates.org_id, orgId)))
    .limit(1);
  if (!result[0]) return null;
  
  const row = result[0];
  return {
    id: row.id,
    title: normalizeString(row.title),
    slug: normalizeString(row.slug),
    content: normalizeString(row.content),
    template_kind: (normalizeString(row.template_kind) || 'GENERIC') as Template['template_kind'],
    category: normalizeString(row.category),
    tags: normalizeArray(row.tags),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

/**
 * Crée un nouveau template
 * 
 * @param data - Données du template à créer
 * @returns Le template créé
 * @throws Error si orgId manquant ou si une erreur DB survient (ex: contrainte unique sur slug)
 * 
 * @remarks
 * Cette fonction ne vérifie pas l'unicité du slug avant insertion. Les Server Actions doivent
 * vérifier l'unicité via getTemplateBySlug() avant d'appeler cette fonction.
 * 
 * La contrainte DB unique composite (org_id, slug) garantit l'unicité au niveau organisationnel,
 * permettant à différentes organisations d'utiliser le même slug.
 */
export async function createTemplate(data: {
  orgId: string;
  title: string;
  slug: string;
  content?: string;
  template_kind?: Template['template_kind'];
  category?: string;
  tags?: string[];
}): Promise<Template> {
  if (!data.orgId) throw new Error('orgId is required');
  
  try {
    const result = await db.insert(templates).values({
      org_id: data.orgId,
      title: data.title,
      slug: data.slug,
      content: data.content ?? '',
      template_kind: data.template_kind ?? 'GENERIC',
      category: data.category ?? '',
      tags: normalizeArray(data.tags),
    }).returning();
    
    const row = firstOrError(result[0], 'Failed to create template');
    
    return {
      id: row.id,
      title: normalizeString(row.title),
      slug: normalizeString(row.slug),
      content: normalizeString(row.content),
      template_kind: (normalizeString(row.template_kind) || 'GENERIC') as Template['template_kind'],
      category: normalizeString(row.category),
      tags: normalizeArray(row.tags),
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  } catch (error) {
    // Gérer les erreurs de contrainte unique sur slug
    if (error instanceof Error && (
      error.message.includes('unique') || 
      error.message.includes('duplicate') ||
      error.message.includes('violates unique constraint')
    )) {
      throw new Error(`Un template avec le slug "${data.slug}" existe déjà dans cette organisation`);
    }
    throw error;
  }
}

export async function updateTemplate(id: string, orgId: string, data: {
  title?: string;
  slug?: string;
  content?: string;
  template_kind?: Template['template_kind'];
  category?: string;
  tags?: string[];
}): Promise<Template> {
  if (!orgId) throw new Error('orgId is required');
  const updateData: Partial<typeof templates.$inferInsert> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.template_kind !== undefined) updateData.template_kind = data.template_kind;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.tags !== undefined) updateData.tags = normalizeArray(data.tags);
  
  const result = await db.update(templates)
    .set(updateData)
    .where(and(eq(templates.id, id), eq(templates.org_id, orgId)))
    .returning();
  
  const row = firstOrError(result[0], `Template not found: ${id}`);
  
  return {
    id: row.id,
    title: normalizeString(row.title),
    slug: normalizeString(row.slug),
    content: normalizeString(row.content),
    template_kind: (normalizeString(row.template_kind) || 'GENERIC') as Template['template_kind'],
    category: normalizeString(row.category),
    tags: normalizeArray(row.tags),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export async function countTemplates(orgId: string): Promise<number> {
  if (!orgId) throw new Error('orgId is required');
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(templates)
    .where(eq(templates.org_id, orgId));
  return Number(result[0]?.count ?? 0);
}


