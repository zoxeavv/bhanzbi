import { eq, desc } from 'drizzle-orm';
import { db } from '../index';
import { offers } from '../schema';
import type { Offer, OfferItem } from '@/types/domain';

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

function normalizeNumber(num: string | null | undefined, defaultValue: number = 0): number {
  if (num === null || num === undefined) return defaultValue;
  const parsed = parseFloat(num);
  return isNaN(parsed) ? defaultValue : parsed;
}

export async function listOffers(): Promise<Offer[]> {
  const results = await db.select().from(offers).orderBy(desc(offers.created_at));
  
  return results.map((row) => ({
    id: row.id,
    client_id: row.client_id,
    template_id: row.template_id ?? null,
    title: normalizeString(row.title),
    items: normalizeArray(row.items),
    subtotal: Math.round(normalizeNumber(row.subtotal)),
    tax_rate: normalizeNumber(row.tax_rate),
    tax_amount: Math.round(normalizeNumber(row.tax_amount)),
    total: Math.round(normalizeNumber(row.total)),
    status: row.status as 'draft' | 'sent' | 'accepted' | 'rejected',
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }));
}

export async function getOfferById(id: string): Promise<Offer> {
  const result = await db.select().from(offers).where(eq(offers.id, id)).limit(1);
  const row = firstOrError(result[0], `Offer not found: ${id}`);
  
  return {
    id: row.id,
    client_id: row.client_id,
    template_id: row.template_id ?? null,
    title: normalizeString(row.title),
    items: normalizeArray(row.items),
    subtotal: Math.round(normalizeNumber(row.subtotal)),
    tax_rate: normalizeNumber(row.tax_rate),
    tax_amount: Math.round(normalizeNumber(row.tax_amount)),
    total: Math.round(normalizeNumber(row.total)),
    status: row.status as 'draft' | 'sent' | 'accepted' | 'rejected',
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export async function createOffer(data: {
  client_id: string;
  template_id?: string | null;
  title: string;
  items: OfferItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  status?: 'draft' | 'sent' | 'accepted' | 'rejected';
}): Promise<Offer> {
  const result = await db.insert(offers).values({
    client_id: data.client_id,
    template_id: data.template_id ?? null,
    title: data.title,
    items: normalizeArray(data.items),
    subtotal: (data.subtotal / 100).toFixed(2),
    tax_rate: data.tax_rate.toFixed(2),
    tax_amount: (data.tax_amount / 100).toFixed(2),
    total: (data.total / 100).toFixed(2),
    status: data.status ?? 'draft',
  }).returning();
  
  const row = firstOrError(result[0], 'Failed to create offer');
  
  return {
    id: row.id,
    client_id: row.client_id,
    template_id: row.template_id ?? null,
    title: normalizeString(row.title),
    items: normalizeArray(row.items),
    subtotal: Math.round(normalizeNumber(row.subtotal)),
    tax_rate: normalizeNumber(row.tax_rate),
    tax_amount: Math.round(normalizeNumber(row.tax_amount)),
    total: Math.round(normalizeNumber(row.total)),
    status: row.status as 'draft' | 'sent' | 'accepted' | 'rejected',
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export async function updateOffer(id: string, data: {
  title?: string;
  items?: OfferItem[];
  subtotal?: number;
  tax_rate?: number;
  tax_amount?: number;
  total?: number;
  status?: 'draft' | 'sent' | 'accepted' | 'rejected';
}): Promise<Offer> {
  const updateData: Partial<typeof offers.$inferInsert> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.items !== undefined) updateData.items = normalizeArray(data.items);
  if (data.subtotal !== undefined) updateData.subtotal = (data.subtotal / 100).toFixed(2);
  if (data.tax_rate !== undefined) updateData.tax_rate = data.tax_rate.toFixed(2);
  if (data.tax_amount !== undefined) updateData.tax_amount = (data.tax_amount / 100).toFixed(2);
  if (data.total !== undefined) updateData.total = (data.total / 100).toFixed(2);
  if (data.status !== undefined) updateData.status = data.status;
  
  const result = await db.update(offers)
    .set(updateData)
    .where(eq(offers.id, id))
    .returning();
  
  const row = firstOrError(result[0], `Offer not found: ${id}`);
  
  return {
    id: row.id,
    client_id: row.client_id,
    template_id: row.template_id ?? null,
    title: normalizeString(row.title),
    items: normalizeArray(row.items),
    subtotal: Math.round(normalizeNumber(row.subtotal)),
    tax_rate: normalizeNumber(row.tax_rate),
    tax_amount: Math.round(normalizeNumber(row.tax_amount)),
    total: Math.round(normalizeNumber(row.total)),
    status: row.status as 'draft' | 'sent' | 'accepted' | 'rejected',
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

