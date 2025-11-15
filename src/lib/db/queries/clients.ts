import { eq, desc, and, sql, or, ilike, inArray } from 'drizzle-orm';
import { db } from '../index';
import { clients, offers } from '../schema';
import type { Client, ClientWithOffersCount } from '@/types/domain';
import { firstOrError, normalizeArray, normalizeString } from '../utils';

export interface ListClientsOptions {
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedClientsResult {
  data: Client[];
  page: number;
  pageSize: number;
  totalCount: number;
}

/**
 * Liste les clients avec support de recherche, filtres et pagination.
 * TOUJOURS filtré par orgId pour la sécurité multi-tenant.
 */
export async function listClients(
  orgId: string,
  options: ListClientsOptions = {}
): Promise<PaginatedClientsResult> {
  if (!orgId) throw new Error('orgId is required');
  
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 20)); // Max 100, default 20
  const offset = (page - 1) * limit;
  
  // Construire les conditions WHERE
  const conditions = [eq(clients.org_id, orgId)];
  
  // Recherche textuelle sur name, company, email
  if (options.search && options.search.trim()) {
    const searchTerm = `%${options.search.trim()}%`;
    conditions.push(
      or(
        ilike(clients.name, searchTerm),
        ilike(clients.company, searchTerm),
        ilike(clients.email, searchTerm)
      )!
    );
  }
  
  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];
  
  // Requête pour le total
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(clients)
    .where(whereClause);
  const totalCount = Number(totalResult[0]?.count ?? 0);
  
  // Requête paginée
  const results = await db
    .select()
    .from(clients)
    .where(whereClause)
    .orderBy(desc(clients.created_at))
    .limit(limit)
    .offset(offset);
  
  return {
    data: results.map((row) => ({
      id: row.id,
      name: normalizeString(row.name),
      company: normalizeString(row.company),
      email: normalizeString(row.email),
      phone: normalizeString(row.phone),
      tags: normalizeArray(row.tags),
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    })),
    page,
    pageSize: limit,
    totalCount,
  };
}

/**
 * Récupère un client par son ID, filtré par orgId pour la sécurité multi-tenant.
 * 
 * Choix de sécurité : Cette fonction ne différencie PAS entre :
 * - Client n'existant pas (NOT_FOUND)
 * - Client existant mais dans une autre organisation (FORBIDDEN)
 * 
 * Raison : Différencier ces cas révélerait l'existence d'un client dans une autre org,
 * ce qui constitue une fuite d'information (information disclosure).
 * 
 * Toutes les erreurs sont traitées de manière générique côté UI (notFound())
 * pour éviter tout leak d'information inter-org.
 */
export async function getClientById(id: string, orgId: string): Promise<Client> {
  if (!orgId) throw new Error('orgId is required');
  const result = await db.select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.org_id, orgId)))
    .limit(1);
  
  // Si aucun résultat, on throw une erreur générique
  // On ne vérifie PAS si le client existe dans une autre org pour éviter les leaks
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

/**
 * Récupère plusieurs clients par leurs IDs en une seule requête SQL.
 * Filtre par orgId pour la sécurité multi-tenant.
 * 
 * Ignore les doublons d'IDs dans le tableau d'entrée.
 * Retourne un Map pour un accès rapide par ID.
 * 
 * @param ids - Tableau d'IDs de clients (les doublons sont ignorés)
 * @param orgId - ID de l'organisation (obligatoire pour la sécurité multi-tenant)
 * @returns Map avec clé = id client, valeur = Client
 */
export async function getClientsByIdsForOrg(
  ids: string[],
  orgId: string
): Promise<Map<string, Client>> {
  if (!orgId) throw new Error('orgId is required');
  
  // Ignorer les doublons et les IDs vides
  const uniqueIds = [...new Set(ids.filter(id => id && id.trim()))];
  
  // Si aucun ID valide, retourner un Map vide
  if (uniqueIds.length === 0) {
    return new Map();
  }
  
  // Une seule requête SQL avec IN pour récupérer tous les clients
  const results = await db
    .select()
    .from(clients)
    .where(and(
      inArray(clients.id, uniqueIds),
      eq(clients.org_id, orgId)
    ));
  
  // Construire le Map avec le mapping DB → domain
  const clientsMap = new Map<string, Client>();
  
  for (const row of results) {
    clientsMap.set(row.id, {
      id: row.id,
      name: normalizeString(row.name),
      company: normalizeString(row.company),
      email: normalizeString(row.email),
      phone: normalizeString(row.phone),
      tags: normalizeArray(row.tags),
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    });
  }
  
  return clientsMap;
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

export async function getClientsWithOffersCount(orgId: string): Promise<ClientWithOffersCount[]> {
  if (!orgId) throw new Error('orgId is required');
  
  const results = await db
    .select({
      id: clients.id,
      name: clients.name,
      company: clients.company,
      email: clients.email,
      phone: clients.phone,
      tags: clients.tags,
      created_at: clients.created_at,
      updated_at: clients.updated_at,
      offersCount: sql<number>`COALESCE(COUNT(${offers.id}), 0)::int`,
    })
    .from(clients)
    .leftJoin(offers, and(
      eq(offers.client_id, clients.id),
      eq(offers.org_id, orgId)
    ))
    .where(eq(clients.org_id, orgId))
    .groupBy(
      clients.id,
      clients.name,
      clients.company,
      clients.email,
      clients.phone,
      clients.tags,
      clients.created_at,
      clients.updated_at
    )
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
    offersCount: Number(row.offersCount ?? 0),
  } as ClientWithOffersCount));
}


