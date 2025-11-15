import type { Client } from "@/types/domain";
import { fetchJsonOrThrow } from "./fetchJson";

interface PaginatedClientsResult {
  data: Client[];
  page: number;
  pageSize: number;
  totalCount: number;
}

/**
 * Helper pour récupérer les clients depuis l'API côté serveur
 * 
 * Utilise fetch() avec les cookies de la requête pour l'authentification.
 * Pour un Server Component, on peut utiliser une URL relative.
 */
export async function fetchClientsFromAPI(options?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedClientsResult> {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", options.page.toString());
  if (options?.limit) params.set("limit", options.limit.toString());
  if (options?.search) params.set("search", options.search);
  
  const url = `/api/clients${params.toString() ? `?${params.toString()}` : ""}`;
  
  // Dans un Server Component, fetch() utilise automatiquement les cookies de la requête
  return fetchJsonOrThrow<PaginatedClientsResult>(url, {
    cache: "no-store", // Force dynamic rendering
  });
}

