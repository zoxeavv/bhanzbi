import { NextResponse } from "next/server"
import { dataStore } from "@/lib/data-store"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const offre = await dataStore.getOffre(params.id)
    if (!offre) {
      return NextResponse.json({ error: "Offre not found" }, { status: 404 })
    }

    const template = await dataStore.getTemplate(offre.template_id)
    const client = await dataStore.getClient(offre.client_id)

    // Simulation de génération PDF
    const pdfContent = `
      OFFRE COMMERCIALE
      
      Client: ${client?.company_name}
      Contact: ${client?.contact_name}
      
      Template: ${template?.name}
      
      Données:
      ${Object.entries(offre.data)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")}
      
      Date: ${new Date().toLocaleDateString("fr-FR")}
    `

    return new NextResponse(pdfContent, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="offre-${params.id}.pdf"`,
      },
    })
  } catch (error) {
    console.error("[v0] Error generating PDF:", error)
    return NextResponse.json({ error: "Error generating PDF" }, { status: 500 })
  }
}
