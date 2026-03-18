import { NextRequest, NextResponse } from "next/server"

import { proxyBggPost, requireBggCookies, toProxyResponse } from "@/lib/bgg-write"

interface CollectionStatusBody {
  fortrade?: boolean
  objectid?: number
  objecttype?: "thing"
  own?: boolean
  prevowned?: boolean
  wishlist?: boolean
  wishlistpriority?: number
  wanttobuy?: boolean
  wanttoplay?: boolean
}

export async function POST(request: NextRequest) {
  const { cookies, response } = requireBggCookies(request)

  if (!cookies) {
    return response!
  }

  if (response) {
    return response
  }

  const body = (await request.json().catch(() => null)) as CollectionStatusBody | null

  if (!body?.objectid) {
    return NextResponse.json({ error: "objectid is required." }, { status: 400 })
  }

  const payload = {
    fortrade: body.fortrade,
    objectid: body.objectid,
    objecttype: body.objecttype ?? "thing",
    own: body.own,
    prevowned: body.prevowned,
    wishlist: body.wishlist,
    wishlistpriority: body.wishlistpriority,
    wanttobuy: body.wanttobuy,
    wanttoplay: body.wanttoplay,
  }

  const upstream = await proxyBggPost("https://boardgamegeek.com/api/collectionitems", cookies, payload, { formFallback: true })
  return toProxyResponse(upstream, "Failed to update the BGG collection status.")
}
