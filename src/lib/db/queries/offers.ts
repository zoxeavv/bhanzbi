import { eq, desc, and, sql, inArray, isNotNull } from 'drizzle-orm';
import { db } from '../index';
import { offers } from '../schema';
import type { Offer, OfferItem } from '@/types/domain';
import { firstOrError, normalizeArray, normalizeString } from '../utils';

function normalizeNumber(num: string | null | undefined, defaultValue: number = 0): number {
  if (num === null || num === undefined) return defaultValue;
  const parsed = parseFloat(num);
  return isNaN(parsed) ? defaultValue : parsed;
}

function mapOfferRow(row: typeof offers.$inferSelect): Offer {
  return {
    id: row.id,
    client_id: row.client_id,
    template_id: row.template_id ?? null,
    title: normalizeString(row.title),
    items: normalizeArray(row.items),
    // Convertir euros (DB) → centimes (TS): multiplier par 100
    subtotal: Math.round(normalizeNumber(row.subtotal) * 100),
    tax_rate: normalizeNumber(row.tax_rate), // Pourcentage, pas de conversion
    tax_amount: Math.round(normalizeNumber(row.tax_amount) * 100),
    total: Math.round(normalizeNumber(row.total) * 100),
    status: row.status as 'draft' | 'sent' | 'accepted' | 'rejected',
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export async function listOffers(orgId: string): Promise<Offer[]> {
  if (!orgId) throw new Error('orgId is required');
  const results = await db.select()
    .from(offers)
    .where(eq(offers.org_id, orgId))
    .orderBy(desc(offers.created_at));
  
  return results.map(mapOfferRow);
}

export async function getOfferById(id: string, orgId: string): Promise<Offer> {
  if (!orgId) throw new Error('orgId is required');
  const result = await db.select()
    .from(offers)
    .where(and(eq(offers.id, id), eq(offers.org_id, orgId)))
    .limit(1);
  const row = firstOrError(result[0], `Offer not found: ${id}`);
  
  return mapOfferRow(row);
}

export async function createOffer(data: {
  orgId: string;
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
  if (!data.orgId) throw new Error('orgId is required');
  const result = await db.insert(offers).values({
    org_id: data.orgId,
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
  
  return mapOfferRow(row);
}

export async function updateOffer(id: string, orgId: string, data: {
  title?: string;
  items?: OfferItem[];
  subtotal?: number;
  tax_rate?: number;
  tax_amount?: number;
  total?: number;
  status?: 'draft' | 'sent' | 'accepted' | 'rejected';
}): Promise<Offer> {
  if (!orgId) throw new Error('orgId is required');
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
    .where(and(eq(offers.id, id), eq(offers.org_id, orgId)))
    .returning();
  
  const row = firstOrError(result[0], `Offer not found: ${id}`);
  
  return mapOfferRow(row);
}

export async function listOffersByClient(clientId: string, orgId: string): Promise<Offer[]> {
  if (!orgId) throw new Error('orgId is required');
  if (!clientId) throw new Error('clientId is required');
  const results = await db.select()
    .from(offers)
    .where(and(eq(offers.org_id, orgId), eq(offers.client_id, clientId)))
    .orderBy(desc(offers.created_at));
  
  return results.map(mapOfferRow);
}

export async function countOffers(orgId: string): Promise<number> {
  if (!orgId) throw new Error('orgId is required');
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(offers)
    .where(eq(offers.org_id, orgId));
  return Number(result[0]?.count ?? 0);
}

export async function getRecentOffers(orgId: string, limit: number = 10): Promise<Offer[]> {
  if (!orgId) throw new Error('orgId is required');
  const results = await db.select()
    .from(offers)
    .where(eq(offers.org_id, orgId))
    .orderBy(desc(offers.created_at))
    .limit(limit);
  
  return results.map(mapOfferRow);
}

/**
 * Récupère la dernière date d'utilisation (MAX(created_at)) pour chaque template
 * 
 * Requête SQL optimisée avec GROUP BY pour éviter de charger toutes les offres.
 * 
 * @param orgId - ID de l'organisation (filtre obligatoire pour multi-tenant)
 * @param templateIds - Tableau d'IDs de templates à interroger
 * @returns Record<mapping template_id -> last_used_at (ISO string ou null)>
 * 
 * @example
 * ```ts
 * const lastUsed = await getLastUsedAtByTemplateIds('org-123', ['tpl-1', 'tpl-2'])
 * // { 'tpl-1': '2024-01-15T10:30:00.000Z', 'tpl-2': null }
 * ```
 */
export async function getLastUsedAtByTemplateIds(
  orgId: string,
  templateIds: string[]
): Promise<Record<string, string | null>> {
  if (!orgId) throw new Error('orgId is required');
  
  // Si aucun template, retourner un objet vide
  if (templateIds.length === 0) {
    return {};
  }

  // Requête SQL optimisée avec GROUP BY et MAX(created_at)
  // Filtre sur org_id (multi-tenant) et template_id IN (...)
  const results = await db
    .select({
      template_id: offers.template_id,
      last_used_at: sql<string>`MAX(${offers.created_at})`.as('last_used_at'),
    })
    .from(offers)
    .where(
      and(
        eq(offers.org_id, orgId),
        inArray(offers.template_id, templateIds),
        isNotNull(offers.template_id)
      )
    )
    .groupBy(offers.template_id);

  // Convertir les résultats en Record<template_id, last_used_at>
  const lastUsedMap: Record<string, string | null> = {};
  
  results.forEach((row) => {
    if (row.template_id && row.last_used_at) {
      // Convertir la date en ISO string
      // Le résultat de MAX(created_at) est un timestamp PostgreSQL
      const dateValue = row.last_used_at;
      if (dateValue instanceof Date) {
        lastUsedMap[row.template_id] = dateValue.toISOString();
      } else if (typeof dateValue === 'string') {
        // Si c'est déjà une string, essayer de la parser puis convertir
        const date = new Date(dateValue);
        lastUsedMap[row.template_id] = !isNaN(date.getTime()) 
          ? date.toISOString() 
          : dateValue;
      } else {
        lastUsedMap[row.template_id] = String(dateValue);
      }
    }
  });

  return lastUsedMap;
}


