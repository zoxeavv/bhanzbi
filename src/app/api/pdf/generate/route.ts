import { NextResponse } from "next/server";
import { getCurrentOrgId, requireSession } from "@/lib/auth/session";
import { getOfferById, updateOffer } from "@/lib/db/queries/offers";
import { getClientById } from "@/lib/db/queries/clients";
import { getTemplateById } from "@/lib/db/queries/templates";
import { generateOffrePDF, generateSignedUrl } from "@/lib/pdf-generator";

export async function POST(request: Request) {
  try {
    await requireSession(); // ✅ Protection explicite pour génération PDF
    const orgId = await getCurrentOrgId();
    const { offreId } = await request.json();

    if (!offreId) {
      return NextResponse.json({ error: "Offre ID requis" }, { status: 400 });
    }

    const offer = await getOfferById(offreId, orgId);
    const client = await getClientById(offer.client_id, orgId);
    const template = offer.template_id ? await getTemplateById(offer.template_id, orgId) : null;

    if (!client) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 404 });
    }

    const pdfBytes = await generateOffrePDF({
      client: client.company || client.name,
      poste: offer.title || "Non spécifié",
      template: template?.title || "N/A",
      fields: {
        title: offer.title,
        items: offer.items,
        total: offer.total,
      },
    });

    const pdfPath = `/pdfs/offre-${offreId}-${Date.now()}.pdf`;

    // TODO: Create version (not yet migrated to Drizzle)
    // await createOfferVersion({ ... });

    await updateOffer(offreId, orgId, { status: "sent" });

    // TODO: Log event (not yet migrated to Drizzle)
    // await createEvent({ ... });

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
