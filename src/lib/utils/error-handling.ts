/**
 * Gestion standardisée des erreurs applicatives.
 * - Loggue dans la console avec un contexte
 * - Retourne un message user-friendly pour l'UI
 * 
 * @param error - L'erreur à gérer (peut être Error, string, ou autre)
 * @param context - Contexte de l'erreur pour les logs (ex: "deleteClient", "createOffer", "loadTemplates")
 * @returns Message d'erreur user-friendly en français
 */
export function handleClientError(error: unknown, context: string): string {
  if (error instanceof Error) {
    console.error(`[${context}]`, error);
    return error.message || "Une erreur est survenue";
  }
  console.error(`[${context}]`, error);
  return "Une erreur est survenue";
}

