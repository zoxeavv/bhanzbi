import { NextResponse } from "next/server";
import { getCurrentOrgId } from "@/lib/auth/session";
import { listTemplates, createTemplate } from "@/lib/db/queries/templates";
import { createTemplateSchema } from "@/lib/validations";
import { z } from "zod";

export async function GET() {
  try {
    const orgId = await getCurrentOrgId();
    const templates = await listTemplates(orgId);
    return NextResponse.json(templates);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('[GET /api/templates] Error:', error);
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
    const validatedData = createTemplateSchema.parse(body);

    const template = await createTemplate({
      orgId,
      title: validatedData.title,
      slug: validatedData.slug,
      content: validatedData.content,
      category: validatedData.category,
      tags: validatedData.tags,
    });

    return NextResponse.json(template, { status: 201 });
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

    console.error('[POST /api/templates] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
