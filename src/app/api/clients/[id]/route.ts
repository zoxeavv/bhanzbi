import { NextResponse } from "next/server"
import { dataStore } from "@/lib/data-store"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const client = await dataStore.getClient(params.id)
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }
  return NextResponse.json(client)
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json()
  const client = await dataStore.updateClient(params.id, body)
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }
  return NextResponse.json(client)
}
