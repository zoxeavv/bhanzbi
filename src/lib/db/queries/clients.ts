import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../index';
import { clients } from '../schema';
import type { Client } from '@/types/domain';

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

export async function listClients(orgId: string): Promise<Client[]> {
  if (!orgId) throw new Error('orgId is required');
  const results = await db.select()
    .from(clients)
    .where(eq(clients.org_id, orgId))
    .orderBy(desc(clients.created_at));
  
  return results.map((row) => ({
    id: row.id,
    name: normalizeString(row.name),
    company: normalizeString(row.company),
    email: normalizeString(row.email),
    phone: normalizeString(row.phone),
    tags: normalizeArray(row.tags),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }));
}

export async function getClientById(id: string, orgId: string): Promise<Client> {
  if (!orgId) throw new Error('orgId is required');
  const result = await db.select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.org_id, orgId)))
    .limit(1);
  const row = firstOrError(result[0], `Client not found: ${id}`);
  
  return {
    id: row.id,
    name: normalizeString(row.name),
    company: normalizeString(row.company),
    email: normalizeString(row.email),
    phone: normalizeString(row.phone),
    tags: normalizeArray(row.tags),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export async function createClient(data: {
  orgId: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  tags?: string[];
}): Promise<Client> {
  if (!data.orgId) throw new Error('orgId is required');
  const result = await db.insert(clients).values({
    org_id: data.orgId,
    name: data.name,
    company: data.company ?? '',
    email: data.email ?? '',
    phone: data.phone ?? '',
    tags: normalizeArray(data.tags),
  }).returning();
  
  const row = firstOrError(result[0], 'Failed to create client');
  
  return {
    id: row.id,
    name: normalizeString(row.name),
    company: normalizeString(row.company),
    email: normalizeString(row.email),
    phone: normalizeString(row.phone),
    tags: normalizeArray(row.tags),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export async function updateClient(id: string, orgId: string, data: {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  tags?: string[];
}): Promise<Client> {
  if (!orgId) throw new Error('orgId is required');
  const updateData: Partial<typeof clients.$inferInsert> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.company !== undefined) updateData.company = data.company;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.tags !== undefined) updateData.tags = normalizeArray(data.tags);
  
  const result = await db.update(clients)
    .set(updateData)
    .where(and(eq(clients.id, id), eq(clients.org_id, orgId)))
    .returning();
  
  const row = firstOrError(result[0], `Client not found: ${id}`);
  
  return {
    id: row.id,
    name: normalizeString(row.name),
    company: normalizeString(row.company),
    email: normalizeString(row.email),
    phone: normalizeString(row.phone),
    tags: normalizeArray(row.tags),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export async function countClients(orgId: string): Promise<number> {
  if (!orgId) throw new Error('orgId is required');
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(clients)
    .where(eq(clients.org_id, orgId));
  return Number(result[0]?.count ?? 0);
}

export async function deleteClient(id: string, orgId: string): Promise<void> {
  if (!orgId) throw new Error('orgId is required');
  const result = await db.delete(clients)
    .where(and(eq(clients.id, id), eq(clients.org_id, orgId)))
    .returning();
  
  if (result.length === 0) {
    throw new Error(`Client not found: ${id}`);
  }
}


