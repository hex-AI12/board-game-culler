import { NextRequest, NextResponse } from "next/server"

import { proxyBggPost, requireBggCookies, toProxyResponse } from "@/lib/bgg-write"

interface RateBody {
  objectid?: number
  rating?: number
}

export async function POST(request: NextRequest) {
  const { cookies, response } = requireBggCookies(request)

  if (!cookies) {
    return response!
  }

  if (response) {
    return response
  }

  const body = (await request.json().catch(() => null)) as RateBody | null

  if (!body?.objectid || typeof body.rating !== "number") {
    return NextResponse.json({ error: "objectid and rating are required." }, { status: 400 })
  }

  if (body.rating < 1 || body.rating > 10) {
    return NextResponse.json({ error: "Rating must be between 1 and 10." }, { status: 400 })
  }

  const payload = {
    objectid: body.objectid,
    objecttype: "thing",
    rating: body.rating,
  }

  const upstream = await proxyBggPost("https://boardgamegeek.com/api/collectionitems", cookies, payload, { formFallback: true })
  return toProxyResponse(upstream, "Failed to save the BGG rating.")
}
