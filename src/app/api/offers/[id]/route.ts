import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrgId, requireSession } from '@/lib/auth/session';
import { requireAdmin } from '@/lib/auth/permissions';
import { getOfferById, updateOffer } from '@/lib/db/queries/offers';
import { getClientById } from '@/lib/db/queries/clients';
import { getTemplateById } from '@/lib/db/queries/templates';
import type { OfferItem } from '@/types/domain';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = await getCurrentOrgId();

    const offer = await getOfferById(id, orgId);
    
    // Récupérer le client et le template (optionnel)
    let client;
    let template = null;
    
    try {
      client = await getClientById(offer.client_id, orgId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    if (offer.template_id) {
      try {
        template = await getTemplateById(offer.template_id, orgId);
      } catch (error) {
        // Template peut ne pas exister, on continue sans
      }
    }

    return NextResponse.json({
      offer,
      client,
      template,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;
    const orgId = await getCurrentOrgId();
    const body = await request.json();

    // Vérifier que l'offre existe
    await getOfferById(id, orgId);

    // Préparer les données de mise à jour
    const updateData: {
      title?: string;
      items?: OfferItem[];
      subtotal?: number;
      tax_rate?: number;
      tax_amount?: number;
      total?: number;
      status?: 'draft' | 'sent' | 'accepted' | 'rejected';
    } = {};

    if (body.title !== undefined) {
      updateData.title = body.title;
    }

    if (body.items !== undefined) {
      updateData.items = body.items;
      
      // Calculer les totaux si items fournis
      const subtotal = body.items.reduce((sum: number, item: OfferItem) => sum + (item.total || 0), 0);
      const taxRate = body.tax_rate ?? 0;
      const taxAmount = Math.round(subtotal * (taxRate / 100));
      const total = subtotal + taxAmount;

      updateData.subtotal = subtotal;
      updateData.tax_rate = taxRate;
      updateData.tax_amount = taxAmount;
      updateData.total = total;
    }

    if (body.tax_rate !== undefined) {
      updateData.tax_rate = body.tax_rate;
      
      // Recalculer si items existent
      const currentOffer = await getOfferById(id, orgId);
      const items = body.items ?? currentOffer.items;
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const taxAmount = Math.round(subtotal * (body.tax_rate / 100));
      const total = subtotal + taxAmount;

      updateData.subtotal = subtotal;
      updateData.tax_amount = taxAmount;
      updateData.total = total;
    }

    if (body.status !== undefined) {
      // Changement de statut nécessite des permissions admin
      await requireAdmin();
      updateData.status = body.status;
    }

    const updatedOffer = await updateOffer(id, orgId, updateData);

    return NextResponse.json(updatedOffer);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


