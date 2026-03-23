import { XMLParser } from "fast-xml-parser"

import type { CollectionItem, GameDetails, PlaySummary } from "@/lib/types"
import { chunk } from "@/lib/utils"

const API_BASE = "https://boardgamegeek.com/xmlapi2"
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseAttributeValue: true,
  trimValues: true,
})

function getApiKey() {
  const apiKey = process.env.BGG_API_KEY

  if (!apiKey) {
    throw new Error("Missing BGG_API_KEY in environment")
  }

  return apiKey
}

function valueOf(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node)
  }

  if (node && typeof node === "object") {
    const record = node as Record<string, unknown>
    if (typeof record["#text"] === "string") {
      return record["#text"]
    }
    if (typeof record.value === "string" || typeof record.value === "number") {
      return String(record.value)
    }
  }

  return ""
}

function arrayify<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return []
  }

  return Array.isArray(value) ? value : [value]
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchXml(path: string, retryOn202 = false) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
      },
      next: { revalidate: 60 * 30 },
    })

    if (response.status === 202 && retryOn202) {
      await sleep(1250 + attempt * 300)
      continue
    }

    if (!response.ok) {
      throw new Error(`BGG request failed (${response.status}) for ${path}`)
    }

    return response.text()
  }

  throw new Error(`BGG queued response never resolved for ${path}`)
}

export async function fetchCollection(
  username: string,
  options: {
    own?: boolean
    trade?: boolean
    wishlist?: boolean
  } = { own: true }
): Promise<CollectionItem[]> {
  const params = new URLSearchParams({
    username,
    stats: "1",
    excludesubtype: "boardgameexpansion",
  })

  if (options.own !== undefined) {
    params.set("own", options.own ? "1" : "0")
  }

  if (options.trade) {
    params.set("trade", "1")
  }

  if (options.wishlist) {
    params.set("wishlist", "1")
  }

  const xml = await fetchXml(`/collection?${params.toString()}`, true)
  const parsed = parser.parse(xml)
  const items = arrayify(parsed.items?.item)

  return items
    .map((item) => ({
      id: Number(item.objectid),
      name: valueOf(item.name),
      yearPublished: item.yearpublished ? Number(valueOf(item.yearpublished)) : undefined,
      image: valueOf(item.image) || undefined,
      thumbnail: valueOf(item.thumbnail) || undefined,
      own: item.status?.own === 1,
      forTrade: item.status?.fortrade === 1 || item.status?.trade === 1,
      wishlist: item.status?.wishlist === 1,
      wishlistPriority: typeof item.status?.wishlistpriority === "number" ? item.status.wishlistpriority : null,
      userRating: item.stats?.rating?.value && item.stats.rating.value !== "N/A" ? Number(item.stats.rating.value) : undefined,
      bggAverageRating:
        item.stats?.rating?.average?.value && item.stats.rating.average.value !== "N/A"
          ? Number(item.stats.rating.average.value)
          : undefined,
      averageWeight:
        item.stats?.rating?.averageweight?.value && item.stats.rating.averageweight.value !== "N/A"
          ? Number(item.stats.rating.averageweight.value)
          : undefined,
      numPlaysOwned: item.numplays ? Number(item.numplays) : undefined,
    }))
    .filter((item) => {
      if (options.wishlist) {
        return Boolean(item.wishlist)
      }

      if (options.trade) {
        return Boolean(item.forTrade)
      }

      return item.own
    })
}

function parseRank(rankNode: unknown) {
  const ranks = arrayify(rankNode as Record<string, unknown> | Array<Record<string, unknown>>)
  const boardgameRank = ranks.find((rank) => rank.name === "boardgame") ?? ranks[0]
  if (!boardgameRank || boardgameRank.value === "Not Ranked") {
    return null
  }
  return Number(boardgameRank.value)
}

export async function fetchGameDetails(ids: number[]): Promise<GameDetails[]> {
  const groups = chunk(ids, 20)
  const results = await Promise.all(
    groups.map(async (group) => {
      const xml = await fetchXml(`/thing?id=${group.join(",")}&stats=1`)
      const parsed = parser.parse(xml)
      return arrayify(parsed.items?.item).map((item) => {
        const links = arrayify(item.link)
        const categories = links.filter((link) => link.type === "boardgamecategory").map((link) => link.value)
        const mechanics = links.filter((link) => link.type === "boardgamemechanic").map((link) => link.value)
        const marketplace = item.marketplacelistings?.listing
        const marketListings = Array.isArray(marketplace) ? marketplace.length : marketplace ? 1 : null
        const marketPrice = marketplace
          ? Number(arrayify(marketplace)
              .map((listing) => Number(listing.price?.value ?? 0))
              .filter(Boolean)
              .reduce((sum, value, _index, all) => sum + value / all.length, 0))
          : null

        return {
          id: Number(item.id),
          description: valueOf(item.description) || undefined,
          image: valueOf(item.image) || undefined,
          thumbnail: valueOf(item.thumbnail) || undefined,
          yearPublished: item.yearpublished?.value ? Number(item.yearpublished.value) : undefined,
          minPlayers: item.minplayers?.value ? Number(item.minplayers.value) : undefined,
          maxPlayers: item.maxplayers?.value ? Number(item.maxplayers.value) : undefined,
          minPlayTime: item.minplaytime?.value ? Number(item.minplaytime.value) : undefined,
          maxPlayTime: item.maxplaytime?.value ? Number(item.maxplaytime.value) : undefined,
          categories,
          mechanics,
          averageWeight: item.statistics?.ratings?.averageweight?.value ? Number(item.statistics.ratings.averageweight.value) : undefined,
          rank: parseRank(item.statistics?.ratings?.ranks?.rank),
          usersRated: item.statistics?.ratings?.usersrated?.value ? Number(item.statistics.ratings.usersrated.value) : undefined,
          averageRating: item.statistics?.ratings?.average?.value ? Number(item.statistics.ratings.average.value) : undefined,
          wantingCount: item.statistics?.ratings?.wanting?.value ? Number(item.statistics.ratings.wanting.value) : null,
          wishingCount: item.statistics?.ratings?.wishing?.value ? Number(item.statistics.ratings.wishing.value) : null,
          marketPrice: marketPrice !== null && Number.isFinite(marketPrice) && marketPrice > 0 ? marketPrice : null,
          marketListings,
          inPrint: item.statistics?.ratings?.owned?.value ? Number(item.statistics.ratings.owned.value) > 1000 : null,
        } satisfies GameDetails
      })
    })
  )

  return results.flat()
}

// BGG plays API returns 100 records per page. Cap at 200 pages (20,000 plays)
// to guard against infinite loops from malformed responses where total stays
// at POSITIVE_INFINITY or BGG returns an unexpectedly large value.
const MAX_PLAY_PAGES = 200

export async function fetchPlays(username: string): Promise<PlaySummary[]> {
  const byGame = new Map<number, { playCount: number; lastPlayed?: string }>()
  let page = 1
  let total = Number.POSITIVE_INFINITY

  while ((page - 1) * 100 < total && page <= MAX_PLAY_PAGES) {
    const xml = await fetchXml(`/plays?username=${encodeURIComponent(username)}&subtype=boardgame&page=${page}`)
    const parsed = parser.parse(xml)
    total = Number(parsed.plays?.total ?? 0)
    const plays = arrayify(parsed.plays?.play)

    if (!plays.length) {
      break
    }

    for (const play of plays) {
      const playedAt = play.date ? new Date(play.date).toISOString() : undefined
      const entries = arrayify(play.item)

      for (const entry of entries) {
        const id = Number(entry.objectid)
        const current = byGame.get(id) ?? { playCount: 0, lastPlayed: undefined }
        current.playCount += Number(play.quantity ?? 1)
        if (playedAt && (!current.lastPlayed || playedAt > current.lastPlayed)) {
          current.lastPlayed = playedAt
        }
        byGame.set(id, current)
      }
    }

    page += 1
  }

  return [...byGame.entries()].map(([gameId, value]) => ({
    gameId,
    playCount: value.playCount,
    lastPlayed: value.lastPlayed,
  }))
}
