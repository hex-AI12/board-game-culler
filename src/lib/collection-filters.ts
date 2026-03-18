import type { DashboardFilters, GameRecord } from "@/lib/types"

export const defaultDashboardFilters: DashboardFilters = {
  search: "",
  playerCount: "any",
  weightRange: [1, 5],
  category: "all",
  mechanic: "all",
  yearRange: [1950, new Date().getFullYear()],
  onlyUnplayed: false,
  onlyUnrated: false,
  sortBy: "score",
  viewMode: "grid",
}

export function buildCollectionFacets(games: GameRecord[] = []) {
  const years = games.map((game) => game.yearPublished).filter(Boolean) as number[]

  return {
    categories: [...new Set(games.flatMap((game) => game.categories ?? []))].sort(),
    mechanics: [...new Set(games.flatMap((game) => game.mechanics ?? []))].sort(),
    years: years.length
      ? ([Math.min(...years), Math.max(...years)] as [number, number])
      : ([1950, new Date().getFullYear()] as [number, number]),
  }
}

export function matchesDashboardFilters(game: GameRecord, filters: DashboardFilters) {
  const searchMatch = game.name.toLowerCase().includes(filters.search.toLowerCase())
  const playerTarget =
    filters.playerCount === "any"
      ? true
      : filters.playerCount === "5"
        ? Boolean(game.maxPlayers && game.maxPlayers >= 5)
        : Boolean(
            game.minPlayers &&
              game.maxPlayers &&
              Number(filters.playerCount) >= game.minPlayers &&
              Number(filters.playerCount) <= game.maxPlayers
          )
  const weightMatch = game.averageWeight
    ? game.averageWeight >= filters.weightRange[0] && game.averageWeight <= filters.weightRange[1]
    : true
  const categoryMatch = filters.category === "all" || (game.categories ?? []).includes(filters.category)
  const mechanicMatch = filters.mechanic === "all" || (game.mechanics ?? []).includes(filters.mechanic)
  const yearMatch = game.yearPublished
    ? game.yearPublished >= filters.yearRange[0] && game.yearPublished <= filters.yearRange[1]
    : true
  const unplayedMatch = !filters.onlyUnplayed || !game.playCount
  const unratedMatch = !filters.onlyUnrated || !game.userRating

  return searchMatch && playerTarget && weightMatch && categoryMatch && mechanicMatch && yearMatch && unplayedMatch && unratedMatch
}

export function sortDashboardGames(games: GameRecord[], sortBy: DashboardFilters["sortBy"]) {
  return [...games].sort((left, right) => {
    switch (sortBy) {
      case "name":
        return left.name.localeCompare(right.name)
      case "rating":
        return (right.userRating ?? 0) - (left.userRating ?? 0)
      case "plays":
        return right.playCount - left.playCount
      case "lastPlayed":
        return (right.lastPlayed ?? "").localeCompare(left.lastPlayed ?? "")
      case "weight":
        return (right.averageWeight ?? 0) - (left.averageWeight ?? 0)
      case "score":
      default:
        return right.cullScore - left.cullScore
    }
  })
}

export function buildPlayHref(filters: DashboardFilters) {
  const searchParams = new URLSearchParams()

  if (filters.playerCount !== "any") {
    searchParams.set("players", filters.playerCount === "5" ? "5" : filters.playerCount)
  }

  if (filters.category !== "all") {
    searchParams.set("category", filters.category)
  }

  if (filters.mechanic !== "all") {
    searchParams.set("mechanic", filters.mechanic)
  }

  if (filters.search.trim()) {
    searchParams.set("search", filters.search.trim())
  }

  const averageWeight = (filters.weightRange[0] + filters.weightRange[1]) / 2
  if (averageWeight <= 2) {
    searchParams.set("weight", "light")
  } else if (averageWeight >= 3.5) {
    searchParams.set("weight", "heavy")
  } else if (filters.weightRange[0] > 1 || filters.weightRange[1] < 5) {
    searchParams.set("weight", "medium")
  }

  const query = searchParams.toString()
  return query ? `/play?${query}` : "/play"
}
