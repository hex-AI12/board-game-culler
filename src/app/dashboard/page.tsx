"use client"

export const dynamic = "force-dynamic"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Flame, LibraryBig, Sparkles, Swords } from "lucide-react"

import { FilterBar } from "@/components/filter-bar"
import { GameCard } from "@/components/game-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClientOnly } from "@/components/client-only"
import { useCollection } from "@/hooks/use-collection"
import type { DashboardFilters, GameRecord } from "@/lib/types"
import { average, round } from "@/lib/utils"

const defaultFilters: DashboardFilters = {
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

function DashboardPageInner() {
  const { dataset, decisions, hydrated } = useCollection()
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters)

  const facets = useMemo(() => {
    const years = dataset?.games.map((game) => game.yearPublished).filter(Boolean) as number[]
    return {
      categories: [...new Set(dataset?.games.flatMap((game) => game.categories ?? []) ?? [])].sort(),
      mechanics: [...new Set(dataset?.games.flatMap((game) => game.mechanics ?? []) ?? [])].sort(),
      years: years.length ? ([Math.min(...years), Math.max(...years)] as [number, number]) : ([1950, new Date().getFullYear()] as [number, number]),
    }
  }, [dataset?.games])

  const resolvedFilters = useMemo(
    () => ({
      ...filters,
      yearRange: filters.yearRange[0] === 1950 && dataset ? facets.years : filters.yearRange,
    }),
    [dataset, facets.years, filters]
  )

  const filteredGames = useMemo(() => {
    const list = dataset?.games ?? []
    return sortGames(
      list.filter((game) => matchesFilters(game, resolvedFilters)),
      resolvedFilters.sortBy
    )
  }, [dataset?.games, resolvedFilters])

  const hotList = filteredGames.filter((game) => game.cullScore >= 60)
  const unplayed = filteredGames.filter((game) => !game.playCount)

  if (!hydrated) {
    return <div className="p-10 text-sm text-muted-foreground">Hydrating collection...</div>
  }

  if (!dataset) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-3xl font-semibold">No collection loaded yet</h1>
        <p className="mt-3 text-muted-foreground">Start from setup, pull your BGG collection, then come back for the full dashboard.</p>
        <Button className="mt-6">
          <Link href="/">Go to setup</Link>
        </Button>
      </div>
    )
  }

  const playsTracked = dataset.games[0]?.playsTracked ?? false

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Scoring mode indicator */}
      <div className={`flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm ${playsTracked ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200" : "border-amber-500/20 bg-amber-500/10 text-amber-200"}`}>
        <span className="font-medium">{playsTracked ? "📊 Play-weighted scoring" : "🎯 Rating-focused scoring"}</span>
        <span className="text-muted-foreground">
          {playsTracked
            ? "Play history detected — frequency and recency are weighted heavily in cull scores."
            : "No play logs detected — scores lean on your ratings, mechanic redundancy, and reacquisition risk instead."}
        </span>
      </div>

      <section className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <SummaryCard icon={<LibraryBig className="size-5" />} label="Collection size" value={dataset.games.length} hint="Owned base games only" />
        <SummaryCard icon={<Flame className="size-5" />} label="High cull fit" value={dataset.games.filter((game) => game.cullScore >= 75).length} hint="Score ≥ 75" />
        <SummaryCard icon={<Swords className="size-5" />} label="Average score" value={round(average(dataset.games.map((game) => game.cullScore)))} hint="Across the full shelf" />
        <SummaryCard icon={<Sparkles className="size-5" />} label="Decisions made" value={Object.keys(decisions).length} hint="Persisted to localStorage" />
      </section>

      <FilterBar
        filters={resolvedFilters}
        onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
        onReset={() => setFilters({ ...defaultFilters, yearRange: facets.years })}
        facets={facets}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Collection dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filteredGames.length} games match your current filters. Start with the hot list, then work card-by-card.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Link href="/results">View results</Link>
          </Button>
          <Button>
            <Link href="/decide">Open decision mode <ArrowRight className="size-4" /></Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-xl">
          <TabsTrigger value="all">All games</TabsTrigger>
          <TabsTrigger value="hot">Cull hotlist</TabsTrigger>
          <TabsTrigger value="unplayed">Unplayed</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <GameGrid games={filteredGames} viewMode={resolvedFilters.viewMode} decisions={decisions} />
        </TabsContent>
        <TabsContent value="hot">
          <GameGrid games={hotList} viewMode={resolvedFilters.viewMode} decisions={decisions} emptyMessage="No hot-list candidates match these filters." />
        </TabsContent>
        <TabsContent value="unplayed">
          <GameGrid games={unplayed} viewMode={resolvedFilters.viewMode} decisions={decisions} emptyMessage="Every filtered game has been played at least once." />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SummaryCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string | number; hint: string }) {
  return (
    <Card className="border-white/10 bg-card/70">
      <CardContent className="p-5">
        <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">{icon}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-3xl font-semibold">{value}</div>
        <div className="mt-2 text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  )
}

function GameGrid({
  games,
  viewMode,
  decisions,
  emptyMessage = "No games match the current filters.",
}: {
  games: GameRecord[]
  viewMode: DashboardFilters["viewMode"]
  decisions: Record<string, string>
  emptyMessage?: string
}) {
  if (!games.length) {
    return <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center text-sm text-muted-foreground">{emptyMessage}</div>
  }

  return (
    <div className={viewMode === "grid" ? "grid gap-5 md:grid-cols-2 xl:grid-cols-3" : "grid gap-5"}>
      {games.map((game) => (
        <GameCard key={game.id} game={game} viewMode={viewMode} decision={decisions[String(game.id)] as never} />
      ))}
    </div>
  )
}

function matchesFilters(game: GameRecord, filters: DashboardFilters) {
  const searchMatch = game.name.toLowerCase().includes(filters.search.toLowerCase())
  const playerTarget = filters.playerCount === "any" ? true : filters.playerCount === "5" ? Boolean(game.maxPlayers && game.maxPlayers >= 5) : Boolean(game.minPlayers && game.maxPlayers && Number(filters.playerCount) >= game.minPlayers && Number(filters.playerCount) <= game.maxPlayers)
  const weightMatch = game.averageWeight ? game.averageWeight >= filters.weightRange[0] && game.averageWeight <= filters.weightRange[1] : true
  const categoryMatch = filters.category === "all" || (game.categories ?? []).includes(filters.category)
  const mechanicMatch = filters.mechanic === "all" || (game.mechanics ?? []).includes(filters.mechanic)
  const yearMatch = game.yearPublished ? game.yearPublished >= filters.yearRange[0] && game.yearPublished <= filters.yearRange[1] : true
  const unplayedMatch = !filters.onlyUnplayed || !game.playCount
  const unratedMatch = !filters.onlyUnrated || !game.userRating

  return searchMatch && playerTarget && weightMatch && categoryMatch && mechanicMatch && yearMatch && unplayedMatch && unratedMatch
}

function sortGames(games: GameRecord[], sortBy: DashboardFilters["sortBy"]) {
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

export default function DashboardPage() {
  return <ClientOnly fallback={null}><DashboardPageInner /></ClientOnly>
}
