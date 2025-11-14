import { NextResponse } from "next/server";
import { getCurrentOrgId } from "@/lib/auth/session";
import { getTemplateById, updateTemplate } from "@/lib/db/queries/templates";
import { createTemplateSchema } from "@/lib/validations";
import { z } from "zod";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await getCurrentOrgId();
    const { id } = await params;
    
    const template = await getTemplateById(id, orgId);
    return NextResponse.json(template);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    console.error('[GET /api/templates/[id]] Error:', error);
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
    
    const validatedData = createTemplateSchema.partial().parse(body);
    
    const template = await updateTemplate(id, orgId, validatedData);
    return NextResponse.json(template);
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
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    console.error('[PATCH /api/templates/[id]] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
