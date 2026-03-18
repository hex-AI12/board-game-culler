import { NextRequest, NextResponse } from "next/server"

import { fetchCollection } from "@/lib/bgg"

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim()

  if (!username) {
    return NextResponse.json({ error: "Missing username" }, { status: 400 })
  }

  try {
    const items = await fetchCollection(username)
    return NextResponse.json({ items })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch collection" },
      { status: 500 }
    )
  }
}
