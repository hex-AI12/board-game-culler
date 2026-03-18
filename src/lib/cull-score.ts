import type { CollectionDataset, CullFactorBreakdown, CullScoreBreakdown, GameRecord } from "@/lib/types"
import { average, clamp, monthsSince, round } from "@/lib/utils"

const WEIGHTS: Record<keyof CullFactorBreakdown, number> = {
  playFrequency: 0.3,
  yourRating: 0.25,
  ratingGap: 0.1,
  redundancy: 0.15,
  weightMismatch: 0.1,
  availability: 0.1,
}

function scorePlayFrequency(game: Partial<GameRecord>) {
  if (!game.playCount) {
    return 100
  }

  const months = monthsSince(game.lastPlayed) ?? 18
  const recencyScore = clamp((months / 12) * 100, 0, 100)
  const playPenalty = clamp(100 - Math.min(game.playCount, 25) * 4, 0, 100)
  return round(recencyScore * 0.7 + playPenalty * 0.3)
}

function scoreYourRating(game: Partial<GameRecord>) {
  if (!game.userRating || game.userRating <= 0) {
    return 55
  }

  return round(clamp(((10 - game.userRating) / 9) * 100, 0, 100))
}

function scoreRatingGap(game: Partial<GameRecord>) {
  if (!game.userRating || !game.averageRating) {
    return 35
  }

  const gap = game.averageRating - game.userRating
  if (gap <= 0) {
    return 10
  }

  return round(clamp((gap / 3.5) * 100, 0, 100))
}

function scoreRedundancy(game: Partial<GameRecord>, mechanicCounts: Map<string, number>) {
  const overlap = (game.mechanics ?? []).map((mechanic) => mechanicCounts.get(mechanic) ?? 0)
  const peak = Math.max(...overlap, 1)
  return round(clamp(((peak - 1) / 5) * 100, 0, 100))
}

function scoreWeightMismatch(game: Partial<GameRecord>, preferredWeight: number) {
  if (!game.averageWeight || !preferredWeight) {
    return 40
  }

  const distance = Math.abs(game.averageWeight - preferredWeight)
  return round(clamp((distance / 2.5) * 100, 0, 100))
}

function scoreAvailability(game: Partial<GameRecord>) {
  const rank = game.rank ?? 15000
  const popularityScore = rank <= 500 ? 95 : rank <= 2000 ? 80 : rank <= 5000 ? 62 : rank <= 10000 ? 45 : 25
  const rarityPenalty = game.inPrint === false ? 30 : game.yearPublished && game.yearPublished < 2005 ? 15 : 0
  const listingsBonus = game.marketListings ? clamp(game.marketListings * 5, 0, 20) : 0
  return round(clamp(popularityScore + listingsBonus - rarityPenalty, 5, 100))
}

function labelForScore(score: number) {
  if (score >= 75) {
    return "High cull fit"
  }

  if (score >= 50) {
    return "Worth reviewing"
  }

  if (score >= 30) {
    return "Probably keep"
  }

  return "Core keeper"
}

function buildInsights(game: Partial<GameRecord>, breakdown: CullFactorBreakdown) {
  const insights: string[] = []

  if (breakdown.playFrequency >= 75) {
    insights.push(game.playCount ? "It has been gathering dust for over a year." : "You own it, but it has never hit the table.")
  }

  if (breakdown.yourRating >= 65) {
    insights.push(game.userRating ? `Your ${game.userRating}/10 rating is lukewarm.` : "You have not rated it yet, so preference is still unknown.")
  }

  if (breakdown.redundancy >= 60 && game.primaryMechanic) {
    insights.push(`Your shelf is already deep on ${game.primaryMechanic.toLowerCase()} games.`)
  }

  if (breakdown.weightMismatch >= 65 && game.averageWeight) {
    insights.push(`Its ${round(game.averageWeight, 1)} weight is off from your usual groove.`)
  }

  if (breakdown.availability >= 70) {
    insights.push("It should be relatively easy to reacquire later.")
  }

  return insights.slice(0, 4)
}

function estimateTradeValue(game: Partial<GameRecord>) {
  if (game.marketPrice) {
    return round(game.marketPrice)
  }

  const base = 8
  const ratingBoost = ((game.averageRating ?? 6) - 5) * 3
  const popularityBoost = game.rank ? clamp((5000 - Math.min(game.rank, 5000)) / 200, 0, 25) : 4
  const scarcityBoost = game.inPrint === false ? 10 : game.yearPublished && game.yearPublished < 2010 ? 5 : 0
  const weightBoost = game.averageWeight ? game.averageWeight * 2 : 3

  return round(clamp(base + ratingBoost + popularityBoost + scarcityBoost + weightBoost, 5, 85))
}

export function scoreGames(games: Omit<GameRecord, "estimatedTradeValue" | "cullScore" | "cullScoreLabel" | "cullBreakdown" | "primaryMechanic" | "bggUrl" | "tradeUrl">[]) {
  const mechanicCounts = new Map<string, number>()

  for (const game of games) {
    for (const mechanic of game.mechanics ?? []) {
      mechanicCounts.set(mechanic, (mechanicCounts.get(mechanic) ?? 0) + 1)
    }
  }

  const weightedWeights = games.flatMap((game) => {
    if (!game.averageWeight || !game.playCount) {
      return []
    }

    return Array.from({ length: Math.min(game.playCount, 8) }, () => game.averageWeight as number)
  })
  const preferredWeight = average(weightedWeights)

  return games
    .map((game) => {
      const primaryMechanic = [...(game.mechanics ?? [])]
        .sort((left, right) => (mechanicCounts.get(right) ?? 0) - (mechanicCounts.get(left) ?? 0))[0]

      const factorScores: CullFactorBreakdown = {
        playFrequency: scorePlayFrequency(game),
        yourRating: scoreYourRating(game),
        ratingGap: scoreRatingGap(game),
        redundancy: scoreRedundancy(game, mechanicCounts),
        weightMismatch: scoreWeightMismatch(game, preferredWeight),
        availability: scoreAvailability(game),
      }

      const total = round(
        Object.entries(factorScores).reduce((sum, [key, value]) => sum + value * WEIGHTS[key as keyof CullFactorBreakdown], 0)
      )

      const cullBreakdown: CullScoreBreakdown = {
        ...factorScores,
        total,
        insights: buildInsights({ ...game, primaryMechanic }, factorScores),
      }

      return {
        ...game,
        primaryMechanic,
        estimatedTradeValue: estimateTradeValue(game),
        cullScore: total,
        cullScoreLabel: labelForScore(total),
        cullBreakdown,
        bggUrl: `https://boardgamegeek.com/boardgame/${game.id}`,
        tradeUrl: `https://boardgamegeek.com/geekmarket/browse?objecttype=thing&objectid=${game.id}&action=search`,
      }
    })
    .sort((left, right) => right.cullScore - left.cullScore)
}

export function attachHistoricalScores(games: GameRecord[], previous?: CollectionDataset | null) {
  if (!previous) {
    return games
  }

  const previousScores = new Map(previous.games.map((game) => [game.id, game.cullScore]))

  return games.map((game) => {
    const previousCullScore = previousScores.get(game.id)
    return {
      ...game,
      previousCullScore,
      scoreDelta: previousCullScore === undefined ? undefined : round(game.cullScore - previousCullScore),
    }
  })
}
