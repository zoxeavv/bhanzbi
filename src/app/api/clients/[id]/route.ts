import { NextResponse } from "next/server";
import { getCurrentOrgId } from "@/lib/auth/session";
import { getClientById, updateClient, deleteClient } from "@/lib/db/queries/clients";
import { createClientSchema } from "@/lib/validations";
import { z } from "zod";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await getCurrentOrgId();
    const { id } = await params;
    
    const client = await getClientById(id, orgId);
    return NextResponse.json(client);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    console.error('[GET /api/clients/[id]] Error:', error);
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
    
    const validatedData = createClientSchema.partial().parse(body);
    
    const client = await updateClient(id, orgId, validatedData);
    return NextResponse.json(client);
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
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    console.error('[PATCH /api/clients/[id]] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await getCurrentOrgId();
    const { id } = await params;
    
    await deleteClient(id, orgId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    console.error('[DELETE /api/clients/[id]] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
