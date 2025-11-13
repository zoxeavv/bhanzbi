import { NextResponse } from "next/server"
import { dataStore } from "@/lib/data-store"

export async function GET() {
  const clients = await dataStore.getClients()
  return NextResponse.json(clients)
}

export async function POST(request: Request) {
  const body = await request.json()
  const client = await dataStore.createClient(body)
  return NextResponse.json(client)
}
