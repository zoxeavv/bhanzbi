import { NextResponse } from "next/server"
import { dataStore } from "@/lib/data-store"
import { generateOffrePDF, generateSignedUrl } from "@/lib/pdf-generator"

export async function POST(request: Request) {
  try {
    const { offreId } = await request.json()

    if (!offreId) {
      return NextResponse.json({ error: "Offre ID requis" }, { status: 400 })
    }

    // Get offre data
    const offre = await dataStore.getOffre(offreId)
    if (!offre) {
      return NextResponse.json({ error: "Offre non trouvée" }, { status: 404 })
    }

    // Get related data
    const client = await dataStore.getClient(offre.client_id)
    const template = await dataStore.getTemplate(offre.template_id)

    if (!client || !template) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 404 })
    }

    // Generate PDF
    const pdfBytes = await generateOffrePDF({
      client: client.company_name,
      poste: offre.data.poste || "Non spécifié",
      template: template.name,
      fields: offre.data,
    })

    // In production, upload to storage (Vercel Blob, S3, etc.)
    // For now, we'll simulate with a mock path
    const pdfPath = `/pdfs/offre-${offreId}-${Date.now()}.pdf`

    // Create version
    await dataStore.createOffreVersion({
      offre_id: offreId,
      data_json: offre.data,
      pdf_path: pdfPath,
    })

    // Update offre status
    await dataStore.updateOffre(offreId, { status: "validated" })

    // Log event
    await dataStore.createEvent({
      entity: "offer",
      action: "generated",
      payload: { offre_id: offreId, pdf_path: pdfPath },
    })

    // Generate signed URL (1 hour expiry)
    const signedUrl = generateSignedUrl(pdfPath, 3600)

    // Return PDF as blob for download
    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="offre-${offreId}.pdf"`,
      },
    })
  } catch (error) {
    console.error("[v0] PDF generation error:", error)
    return NextResponse.json({ error: "Erreur lors de la génération du PDF" }, { status: 500 })
  }
}
