/**
 * Helper pour effectuer des requêtes fetch avec gestion d'erreurs améliorée
 * 
 * Cette fonction :
 * - Parse automatiquement le JSON de la réponse
 * - Extrait les messages d'erreur de l'API si disponibles
 * - Log les détails d'erreur pour faciliter le debug
 * - Lance des erreurs avec des messages explicites
 * 
 * @param input - URL ou RequestInfo pour fetch
 * @param init - Options RequestInit pour fetch
 * @returns Promise avec le JSON parsé
 * @throws Error avec un message détaillé en cas d'échec
 * 
 * @example
 * ```ts
 * const data = await fetchJsonOrThrow('/api/clients');
 * ```
 */
export async function fetchJsonOrThrow<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : undefined;
  
  const res = await fetch(input, init);
  
  let body: any = null;
  try {
    body = await res.json();
  } catch (e) {
    // Si la réponse n'est pas du JSON valide, body reste null
    // On continuera avec les informations de status
  }
  
  if (!res.ok) {
    // Construire un message d'erreur détaillé
    const errorMessage =
      body?.error ||
      body?.message ||
      `Request failed with status ${res.status}${res.statusText ? `: ${res.statusText}` : ''}`;
    
    // Log les détails pour faciliter le debug
    console.error('[fetchJsonOrThrow] API fetch failed', {
      url,
      method: init?.method || 'GET',
      status: res.status,
      statusText: res.statusText,
      body,
    });
    
    throw new Error(errorMessage);
  }
  
  return body as T;
}


