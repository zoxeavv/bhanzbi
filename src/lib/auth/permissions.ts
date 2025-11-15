import { requireSession } from './session';

/**
 * Vérifie que l'utilisateur courant a le rôle ADMIN.
 * 
 * Cette fonction doit être appelée au début des Server Actions qui nécessitent
 * des permissions d'administration, notamment pour les mutations critiques
 * du domaine Templates (create, update, duplicate, reset).
 * 
 * IMPORTANT : ne jamais fallback automatiquement à ADMIN, le rôle doit être explicitement défini dans user_metadata.
 * 
 * @throws Error avec message "Unauthorized" si l'utilisateur n'est pas ADMIN
 * @throws Error avec message "User role not defined" si le rôle n'est pas défini
 * 
 * @example
 * ```ts
 * export async function createTemplate(...) {
 *   await requireAdmin(); // Vérifie les permissions avant toute opération
 *   // ... reste du code
 * }
 * ```
 */
export async function requireAdmin(): Promise<void> {
  const session = await requireSession();
  
  // Vérification stricte : le rôle doit être explicitement défini
  if (!session.user.role) {
    throw new Error("User role not defined");
  }
  
  // Vérification stricte : le rôle doit être exactement "ADMIN"
  if (session.user.role !== "ADMIN") {
    // Lancer une erreur avec le message "Unauthorized" pour être cohérent
    // avec la gestion d'erreur dans les Server Actions (ils vérifient error.message === 'Unauthorized')
    throw new Error("Unauthorized");
  }
}

