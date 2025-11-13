import { NextResponse } from "next/server"
import { dataStore } from "@/lib/data-store"

export async function GET() {
  const templates = await dataStore.getTemplates()
  return NextResponse.json(templates)
}

export async function POST(request: Request) {
  const body = await request.json()
  const template = await dataStore.createTemplate(body)
  return NextResponse.json(template)
}
