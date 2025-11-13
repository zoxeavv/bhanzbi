import { NextResponse } from "next/server"
import { dataStore } from "@/lib/data-store"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const offre = await dataStore.getOffre(params.id)
  if (!offre) {
    return NextResponse.json({ error: "Offre not found" }, { status: 404 })
  }
  return NextResponse.json(offre)
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json()
  const offre = await dataStore.updateOffre(params.id, body)
  if (!offre) {
    return NextResponse.json({ error: "Offre not found" }, { status: 404 })
  }
  return NextResponse.json(offre)
}
