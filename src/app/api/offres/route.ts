import { NextResponse } from "next/server";
import { getCurrentOrgId } from "@/lib/auth/session";
import { listOffers, createOffer } from "@/lib/db/queries/offers";
import { createOfferSchema } from "@/lib/validations";
import { z } from "zod";

export async function GET() {
  try {
    const orgId = await getCurrentOrgId();
    const offers = await listOffers(orgId);
    return NextResponse.json(offers);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('[GET /api/offres] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await getCurrentOrgId();
    const body = await request.json();
    const validatedData = createOfferSchema.parse(body);

    const offer = await createOffer({
      orgId,
      client_id: validatedData.client_id,
      template_id: validatedData.template_id ?? null,
      title: validatedData.title,
      items: validatedData.items,
      subtotal: validatedData.subtotal,
      tax_rate: validatedData.tax_rate,
      tax_amount: validatedData.tax_amount,
      total: validatedData.total,
      status: validatedData.status,
    });

    return NextResponse.json(offer, { status: 201 });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[POST /api/offres] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
