import { NextResponse } from "next/server";
import { getCurrentOrgId } from "@/lib/auth/session";
import { listClients, createClient } from "@/lib/db/queries/clients";
import { createClientSchema } from "@/lib/validations";
import { z } from "zod";

export async function GET() {
  try {
    const orgId = await getCurrentOrgId();
    const clients = await listClients(orgId);
    return NextResponse.json(clients);
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('[GET /api/clients] Error:', error);
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
    const validatedData = createClientSchema.parse(body);

    const client = await createClient({
      orgId,
      name: validatedData.name,
      company: validatedData.company,
      email: validatedData.email,
      phone: validatedData.phone,
      tags: validatedData.tags,
    });

    return NextResponse.json(client, { status: 201 });
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

    console.error('[POST /api/clients] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
