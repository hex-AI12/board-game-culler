import { NextRequest, NextResponse } from "next/server"

import { fetchCollection, fetchGameDetails } from "@/lib/bgg"
import type { WishlistRecord } from "@/lib/types"

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim()

  if (!username) {
    return NextResponse.json({ error: "Missing username" }, { status: 400 })
  }

  try {
    const wishlistItems = await fetchCollection(username, { wishlist: true })
    const details = wishlistItems.length ? await fetchGameDetails(wishlistItems.map((item) => item.id)) : []
    const detailsById = new Map(details.map((item) => [item.id, item]))

    const items: WishlistRecord[] = wishlistItems.map((item) => {
      const detail = detailsById.get(item.id)

      return {
        ...item,
        ...detail,
        categories: detail?.categories ?? [],
        mechanics: detail?.mechanics ?? [],
        image: item.image ?? detail?.image,
        thumbnail: item.thumbnail ?? detail?.thumbnail,
        bggUrl: `https://boardgamegeek.com/boardgame/${item.id}`,
        estimatedPrice: detail?.marketPrice ?? null,
      }
    })

    return NextResponse.json({
      username,
      loadedAt: new Date().toISOString(),
      items,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch wishlist" },
      { status: 500 }
    )
  }
}
