import { NextResponse } from "next/server"
import { dataStore } from "@/lib/data-store"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const template = await dataStore.getTemplate(params.id)
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 })
  }
  return NextResponse.json(template)
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json()
  const templates = await dataStore.getTemplates()
  const index = templates.findIndex((t) => t.id === params.id)
  if (index === -1) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 })
  }
  templates[index] = { ...templates[index], ...body }
  return NextResponse.json(templates[index])
}
