import { NextRequest, NextResponse } from "next/server"

import { fetchGameDetails } from "@/lib/bgg"

const MAX_IDS = 500

export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams
    .get("ids")
    ?.split(",")
    .map((id) => Number(id.trim()))
    .filter(Boolean)

  if (!ids?.length) {
    return NextResponse.json({ error: "Missing ids" }, { status: 400 })
  }

  if (ids.length > MAX_IDS) {
    return NextResponse.json({ error: `Too many ids: max ${MAX_IDS}` }, { status: 400 })
  }

  try {
    const items = await fetchGameDetails(ids)
    return NextResponse.json({ items })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch game details" },
      { status: 500 }
    )
  }
}
