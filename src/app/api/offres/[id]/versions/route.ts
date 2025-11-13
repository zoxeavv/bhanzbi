import { NextResponse } from "next/server"
import { dataStore } from "@/lib/data-store"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const versions = await dataStore.getOffreVersions(params.id)
    return NextResponse.json(versions)
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la récupération des versions" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const offre = await dataStore.getOffre(params.id)
    if (!offre) {
      return NextResponse.json({ error: "Offre non trouvée" }, { status: 404 })
    }

    const version = await dataStore.createOffreVersion({
      offre_id: params.id,
      data_json: offre.data,
    })

    return NextResponse.json(version)
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la création de la version" }, { status: 500 })
  }
}
