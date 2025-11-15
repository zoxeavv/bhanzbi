"use server";

/**
 * Server actions pour le dashboard
 * 
 * Ces actions seront implémentées plus tard pour gérer :
 * - Les tâches (création, mise à jour, suppression)
 * - Les actions rapides (création client, offre, template)
 */

import { revalidatePath } from "next/cache";
import type { Task } from "@/types/domain";

/**
 * Toggle l'état d'une tâche (done/undone)
 * 
 * @param taskId - ID de la tâche
 * @param done - Nouvel état (true/false)
 */
export async function toggleTask(taskId: string, done: boolean): Promise<void> {
  // TODO: Implémenter la logique de mise à jour en base de données
  // const orgId = await getCurrentOrgId();
  // await updateTask(taskId, { done }, orgId);
  
  revalidatePath("/dashboard");
}

/**
 * Créer une nouvelle tâche
 * 
 * @param task - Données de la tâche à créer
 */
export async function createTask(task: Omit<Task, "id" | "created_at" | "updated_at">): Promise<Task> {
  // TODO: Implémenter la logique de création en base de données
  // const orgId = await getCurrentOrgId();
  // const newTask = await insertTask(task, orgId);
  
  revalidatePath("/dashboard");
  throw new Error("Not implemented");
}

/**
 * Supprimer une tâche
 * 
 * @param taskId - ID de la tâche à supprimer
 */
export async function deleteTask(taskId: string): Promise<void> {
  // TODO: Implémenter la logique de suppression en base de données
  // const orgId = await getCurrentOrgId();
  // await deleteTaskById(taskId, orgId);
  
  revalidatePath("/dashboard");
}

/**
 * Redirection vers la page de création de client
 * Cette action sera utilisée par le bouton "Create Client" dans QuickActionsCard
 */
export async function navigateToCreateClient(): Promise<void> {
  // Cette action peut être remplacée par un simple Link dans le composant
  // Mais on la garde ici pour documenter l'intention
}

/**
 * Redirection vers la page de création d'offre
 * Cette action sera utilisée par le bouton "Create Offer" dans QuickActionsCard
 */
export async function navigateToCreateOffer(): Promise<void> {
  // Cette action peut être remplacée par un simple Link dans le composant
  // Mais on la garde ici pour documenter l'intention
}

/**
 * Redirection vers la page de création de template
 * Cette action sera utilisée par le bouton "Create Template" dans QuickActionsCard
 */
export async function navigateToCreateTemplate(): Promise<void> {
  // Cette action peut être remplacée par un simple Link dans le composant
  // Mais on la garde ici pour documenter l'intention
}

