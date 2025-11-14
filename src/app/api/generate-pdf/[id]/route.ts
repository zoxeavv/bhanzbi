import { NextResponse } from "next/server";
import { getCurrentOrgId } from "@/lib/auth/session";
import { getOfferById } from "@/lib/db/queries/offers";
import { getTemplateById } from "@/lib/db/queries/templates";
import { getClientById } from "@/lib/db/queries/clients";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await getCurrentOrgId();
    const { id } = await params;
    
    const offer = await getOfferById(id, orgId);
    const template = offer.template_id ? await getTemplateById(offer.template_id, orgId) : null;
    const client = await getClientById(offer.client_id, orgId);

    // Simulation de génération PDF
    const pdfContent = `
      OFFRE COMMERCIALE
      
      Client: ${client?.company || client?.name}
      Contact: ${client?.name}
      
      Template: ${template?.title || "N/A"}
      
      Titre: ${offer.title}
      Items: ${offer.items.length} article(s)
      Total: ${(offer.total / 100).toFixed(2)} €
      
      Date: ${new Date().toLocaleDateString("fr-FR")}
    `

    return new NextResponse(pdfContent, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="offre-${id}.pdf"`,
      },
    })
  } catch (error) {
    console.error("[v0] Error generating PDF:", error)
    return NextResponse.json({ error: "Error generating PDF" }, { status: 500 })
  }
}
