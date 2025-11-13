import { NextResponse } from "next/server"
import { dataStore } from "@/lib/data-store"

export async function GET() {
  const offres = await dataStore.getOffres()
  return NextResponse.json(offres)
}

export async function POST(request: Request) {
  const body = await request.json()
  const offre = await dataStore.createOffre(body)
  return NextResponse.json(offre)
}
