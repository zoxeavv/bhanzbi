import { NextResponse } from "next/server";
import { getCurrentOrgId, requireSession } from "@/lib/auth/session";
import { getOfferById } from "@/lib/db/queries/offers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await getCurrentOrgId();
    const { id } = await params;
    
    await getOfferById(id, orgId);
    
    // TODO: Versions not yet migrated to Drizzle
    return NextResponse.json([]);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: "Offre non trouvée" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erreur lors de la récupération des versions" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession(); // ✅ Protection explicite pour création de version legacy
    const orgId = await getCurrentOrgId();
    const { id } = await params;
    
    const offer = await getOfferById(id, orgId);
    
    // TODO: Versions not yet migrated to Drizzle
    const version = {
      id: `version-${Date.now()}`,
      offre_id: id,
      version_number: 1,
      data_json: {
        title: offer.title,
        items: offer.items,
        total: offer.total,
      },
      created_at: new Date().toISOString(),
    };
    
    return NextResponse.json(version);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: "Offre non trouvée" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erreur lors de la création de la version" }, { status: 500 });
  }
}
