import { redirect } from "next/navigation"
import { Suspense } from "react"
import { getCurrentOrgId } from "@/lib/auth/session"
import { listTemplates } from "@/lib/db/queries/templates"
import { getLastUsedAtByTemplateIds } from "@/lib/db/queries/offers"
import { TemplatesPageClient } from "@/components/templates/TemplatesPageClient"

export default async function TemplatesPage() {
  try {
    // Récupérer l'orgId côté serveur (jamais exposé au client)
    const orgId = await getCurrentOrgId()
    
    // Récupérer les templates directement depuis la DB
    const templates = await listTemplates(orgId)
    
    // Récupérer les IDs des templates pour calculer lastUsedAt
    const templateIds = templates.map((t) => t.id)
    
    // Calculer lastUsedAt avec une requête SQL optimisée
    const lastUsedMap = await getLastUsedAtByTemplateIds(orgId, templateIds)
    
    // Enrichir les templates avec lastUsedAt
    const enrichedTemplates = templates.map((template) => ({
      ...template,
      lastUsedAt: lastUsedMap[template.id] || null,
    }))
    
    // Passer les données au composant client avec Suspense pour useSearchParams
    return (
      <Suspense fallback={<div>Chargement...</div>}>
        <TemplatesPageClient templates={enrichedTemplates} />
      </Suspense>
    )
  } catch (error) {
    // En cas d'erreur (ex: non authentifié), rediriger avec message d'erreur
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      console.error('[TemplatesPage] Unauthorized:', error)
      redirect('/authentication/login?error=unauthorized')
    }
    
    // Pour les autres erreurs, rediriger vers la page d'accueil avec message d'erreur
    console.error('[TemplatesPage] Error:', error)
    redirect('/?error=template_load_failed')
  }
}
