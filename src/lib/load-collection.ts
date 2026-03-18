import { attachHistoricalScores, scoreGames } from "@/lib/cull-score"
import type { CollectionDataset, CollectionItem, GameDetails, LoadingStage, PlaySummary } from "@/lib/types"

async function getJson<T>(url: string) {
  const response = await fetch(url)
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed: ${response.status}`)
  }

  return payload as T
}

export async function loadCollectionBundle(
  username: string,
  onProgress?: (stage: LoadingStage) => void,
  previousDataset?: CollectionDataset | null
): Promise<CollectionDataset> {
  onProgress?.({ key: "collection", label: "Fetching collection", progress: 15 })
  const collection = await getJson<{ items: CollectionItem[] }>(`/api/collection?username=${encodeURIComponent(username)}`)

  const ids = collection.items.map((item) => item.id)
  onProgress?.({ key: "details", label: `Fetching details for ${ids.length} games`, progress: 48 })
  const details = await getJson<{ items: GameDetails[] }>(`/api/games?ids=${ids.join(",")}`)

  onProgress?.({ key: "plays", label: "Fetching play history", progress: 78 })
  const plays = await getJson<{ items: PlaySummary[] }>(`/api/plays?username=${encodeURIComponent(username)}`)
  const playsById = new Map(plays.items.map((item) => [item.gameId, item]))
  const detailsById = new Map(details.items.map((item) => [item.id, item]))

  onProgress?.({ key: "scoring", label: "Calculating cull scores", progress: 92 })
  const scoredGames = scoreGames(
    collection.items.map((item) => {
      const detail = detailsById.get(item.id)
      const play = playsById.get(item.id)

      return {
        ...item,
        ...detail,
        categories: detail?.categories ?? [],
        mechanics: detail?.mechanics ?? [],
        gameId: item.id,
        playCount: play?.playCount ?? item.numPlaysOwned ?? 0,
        lastPlayed: play?.lastPlayed,
      }
    })
  )

  return {
    username,
    loadedAt: new Date().toISOString(),
    previousLoadedAt: previousDataset?.loadedAt,
    games: attachHistoricalScores(scoredGames, previousDataset),
  }
}
