import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/permissions";
import { getCurrentOrgId } from "@/lib/auth/session";
import { listAdminAllowedEmails } from "@/lib/db/queries/adminAllowedEmails";
import { AdminAllowedEmailsClient } from "./AdminAllowedEmailsClient";

export const dynamic = "force-dynamic";

/**
 * Page Server Component pour la gestion des emails autorisés à devenir admin
 * 
 * SÉCURITÉ :
 * - Protégée par requireAdmin() (seuls les admins peuvent accéder)
 * - orgId vient TOUJOURS de getCurrentOrgId(), jamais du client
 * - Toutes les queries sont filtrées par org_id
 */
export default async function AdminsSettingsPage() {
  try {
    // Vérifier les permissions admin
    await requireAdmin();
    const orgId = await getCurrentOrgId();
    
    // Récupérer la liste des emails autorisés côté serveur
    const items = await listAdminAllowedEmails(orgId);
    
    return (
      <div className="space-y-6">
        {/* PageHeader */}
        <PageHeader
          title="Gestion des admins"
          description="Gérez les emails autorisés à obtenir le rôle ADMIN lors de l'inscription."
        />
        
        {/* Formulaire et liste */}
        <AdminAllowedEmailsClient initialItems={items} />
      </div>
    );
  } catch (error) {
    // En cas d'erreur (ex: non authentifié ou non admin), rediriger vers la page de connexion
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      console.error('[AdminsSettingsPage] Unauthorized:', error);
      redirect('/authentication/login?error=unauthorized');
    }
    
    // Pour les autres erreurs, rediriger vers le dashboard avec message d'erreur
    console.error('[AdminsSettingsPage] Error:', error);
    redirect('/dashboard?error=admins_settings_load_failed');
  }
}


