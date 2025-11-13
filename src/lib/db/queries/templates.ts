import { eq, desc } from 'drizzle-orm';
import { db } from '../index';
import { templates } from '../schema';
import type { Template } from '@/types/domain';

function firstOrError<T>(result: T | undefined, error: string): T {
  if (!result) {
    throw new Error(error);
  }
  return result;
}

function normalizeArray<T>(arr: T[] | null | undefined): T[] {
  return Array.isArray(arr) ? arr : [];
}

function normalizeString(str: string | null | undefined): string {
  return str ?? '';
}

export async function listTemplates(): Promise<Template[]> {
  const results = await db.select().from(templates).orderBy(desc(templates.created_at));
  
  return results.map((row) => ({
    id: row.id,
    title: normalizeString(row.title),
    slug: normalizeString(row.slug),
    content: normalizeString(row.content),
    category: normalizeString(row.category),
    tags: normalizeArray(row.tags),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }));
}

export async function getTemplateById(id: string): Promise<Template> {
  const result = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
  const row = firstOrError(result[0], `Template not found: ${id}`);
  
  return {
    id: row.id,
    title: normalizeString(row.title),
    slug: normalizeString(row.slug),
    content: normalizeString(row.content),
    category: normalizeString(row.category),
    tags: normalizeArray(row.tags),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export async function getTemplateBySlug(slug: string): Promise<Template | null> {
  const result = await db.select().from(templates).where(eq(templates.slug, slug)).limit(1);
  if (!result[0]) return null;
  
  const row = result[0];
  return {
    id: row.id,
    title: normalizeString(row.title),
    slug: normalizeString(row.slug),
    content: normalizeString(row.content),
    category: normalizeString(row.category),
    tags: normalizeArray(row.tags),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export async function createTemplate(data: {
  title: string;
  slug: string;
  content?: string;
  category?: string;
  tags?: string[];
}): Promise<Template> {
  const result = await db.insert(templates).values({
    title: data.title,
    slug: data.slug,
    content: data.content ?? '',
    category: data.category ?? '',
    tags: normalizeArray(data.tags),
  }).returning();
  
  const row = firstOrError(result[0], 'Failed to create template');
  
  return {
    id: row.id,
    title: normalizeString(row.title),
    slug: normalizeString(row.slug),
    content: normalizeString(row.content),
    category: normalizeString(row.category),
    tags: normalizeArray(row.tags),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export async function updateTemplate(id: string, data: {
  title?: string;
  slug?: string;
  content?: string;
  category?: string;
  tags?: string[];
}): Promise<Template> {
  const updateData: Partial<typeof templates.$inferInsert> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.tags !== undefined) updateData.tags = normalizeArray(data.tags);
  
  const result = await db.update(templates)
    .set(updateData)
    .where(eq(templates.id, id))
    .returning();
  
  const row = firstOrError(result[0], `Template not found: ${id}`);
  
  return {
    id: row.id,
    title: normalizeString(row.title),
    slug: normalizeString(row.slug),
    content: normalizeString(row.content),
    category: normalizeString(row.category),
    tags: normalizeArray(row.tags),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}


