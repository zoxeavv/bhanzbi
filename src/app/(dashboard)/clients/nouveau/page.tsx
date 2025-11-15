import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/permissions";
import { NewClientForm } from "./NewClientForm";

export const dynamic = "force-dynamic";

/**
 * Page Server Component pour la création d'un nouveau client
 * 
 * SÉCURITÉ :
 * - Protégée par requireAdmin() (seuls les admins peuvent créer des clients)
 * - Redirige vers /authentication/login?error=unauthorized si non autorisé
 */
export default async function NewClientPage() {
  try {
    // Vérifier les permissions admin
    await requireAdmin();
    
    return <NewClientForm />;
  } catch (error) {
    // En cas d'erreur (ex: non authentifié ou non admin), rediriger vers la page de connexion
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'User role not defined' || error.message.includes('Organization ID'))) {
      console.error('[NewClientPage] Unauthorized:', error);
      redirect('/authentication/login?error=unauthorized');
    }
    
    // Pour les autres erreurs, rediriger vers le dashboard avec message d'erreur
    console.error('[NewClientPage] Error:', error);
    redirect('/dashboard?error=client_creation_failed');
  }
}
