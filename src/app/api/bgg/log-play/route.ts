import { NextRequest, NextResponse } from "next/server"

import { proxyBggPost, requireBggCookies, toProxyResponse } from "@/lib/bgg-write"

interface BggPlayPlayer {
  name: string
  username?: string
  score?: string
  win?: boolean
}

interface LogPlayBody {
  comments?: string
  length?: number
  location?: string
  objectid?: number
  playdate?: string
  players?: BggPlayPlayer[]
  quantity?: number
}

export async function POST(request: NextRequest) {
  const { cookies, response } = requireBggCookies(request)

  if (!cookies) {
    return response!
  }

  if (response) {
    return response
  }

  const body = (await request.json().catch(() => null)) as LogPlayBody | null

  if (!body?.objectid || !body.playdate) {
    return NextResponse.json({ error: "objectid and playdate are required." }, { status: 400 })
  }

  const payload = {
    ajax: 1,
    action: "save",
    comments: body.comments ?? "",
    length: body.length,
    location: body.location ?? "",
    objectid: body.objectid,
    objecttype: "thing",
    playdate: body.playdate,
    players: body.players ?? [],
    quantity: body.quantity ?? 1,
  }

  const upstream = await proxyBggPost("https://boardgamegeek.com/geekplay.php", cookies, payload)
  return toProxyResponse(upstream, "Failed to log the play on BGG.")
}
