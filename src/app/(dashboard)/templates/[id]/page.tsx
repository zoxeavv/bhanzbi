import { redirect } from "next/navigation"
import { getCurrentOrgId } from "@/lib/auth/session"
import { getTemplateById } from "@/lib/db/queries/templates"
import { parseTemplateContent } from "@/lib/templates/content"
import { TemplateDetailClient } from "@/components/templates/TemplateDetailClient"

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  try {
    const { id } = await params
    
    // Rediriger si c'est la page "nouveau"
    if (id === "nouveau") {
      redirect("/templates/nouveau")
    }

    // Récupérer l'orgId côté serveur (jamais exposé au client)
    const orgId = await getCurrentOrgId()
    
    // Charger le template directement depuis la DB
    const template = await getTemplateById(id, orgId)
    
    // Parser le content pour obtenir les champs
    const parsedFields = parseTemplateContent(template.content)
    
    // Détecter si le parsing a échoué
    // Si le content n'est pas vide mais les champs parsés sont vides, c'est une erreur
    const contentIsEmpty = !template.content || template.content.trim() === "" || template.content === '{"fields":[]}'
    const hasInvalidContent = !contentIsEmpty && parsedFields.length === 0
    
    if (hasInvalidContent) {
      console.error("[TemplateDetailPage] Erreur de parsing du content:", {
        templateId: template.id,
        content: template.content,
        parsedFields,
      })
    }
    
    // Passer les données au composant client
    return (
      <TemplateDetailClient
        template={template}
        initialFields={parsedFields}
        hasInvalidContent={hasInvalidContent}
      />
    )
  } catch (error) {
    // En cas d'erreur (ex: non authentifié, template non trouvé), rediriger avec message d'erreur
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      console.error('[TemplateDetailPage] Unauthorized:', error)
      redirect('/login?error=unauthorized')
    }
    if (error instanceof Error && error.message.includes('not found')) {
      console.error('[TemplateDetailPage] Template not found:', id)
      redirect('/templates?error=template_not_found')
    }
    
    // Pour les autres erreurs, rediriger vers la liste des templates avec message d'erreur
    console.error('[TemplateDetailPage] Error:', error)
    redirect('/templates?error=template_load_failed')
  }
}
