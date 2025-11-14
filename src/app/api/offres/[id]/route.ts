import { NextResponse } from "next/server";
import { getCurrentOrgId } from "@/lib/auth/session";
import { getOfferById, updateOffer } from "@/lib/db/queries/offers";
import { createOfferSchema } from "@/lib/validations";
import { z } from "zod";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await getCurrentOrgId();
    const { id } = await params;
    
    const offer = await getOfferById(id, orgId);
    return NextResponse.json(offer);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }
    console.error('[GET /api/offres/[id]] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await getCurrentOrgId();
    const { id } = await params;
    const body = await request.json();
    
    const validatedData = createOfferSchema.partial().parse(body);
    
    const offer = await updateOffer(id, orgId, validatedData);
    return NextResponse.json(offer);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }
    console.error('[PATCH /api/offres/[id]] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
