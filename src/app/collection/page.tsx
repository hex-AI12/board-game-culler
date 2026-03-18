"use client"

export const dynamic = "force-dynamic"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Coins, Flame, Heart, LibraryBig, Sparkles, Swords } from "lucide-react"
import { toast } from "sonner"

import { BggRateDialog } from "@/components/bgg-rate-dialog"
import { ClientOnly } from "@/components/client-only"
import { EmptyState } from "@/components/empty-state"
import { FilterBar } from "@/components/filter-bar"
import { GameCard } from "@/components/game-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useBggActions } from "@/hooks/use-bgg-actions"
import { useBggSession } from "@/hooks/use-bgg-session"
import { useCollection } from "@/hooks/use-collection"
import { useDocumentTitle } from "@/hooks/use-document-title"
import {
  buildCollectionFacets,
  buildPlayHref,
  defaultDashboardFilters,
  matchesDashboardFilters,
  sortDashboardGames,
} from "@/lib/collection-filters"
import type { DashboardFilters, GameRecord } from "@/lib/types"
import { average, formatCurrency, round } from "@/lib/utils"

function CollectionPageInner() {
  const { dataset, decisions, hydrated, updateGame } = useCollection()
  const { isLoggedIn } = useBggSession()
  const { handleBggError, updateCollectionStatus } = useBggActions()
  const [filters, setFilters] = useState<DashboardFilters>(defaultDashboardFilters)
  const [ratingGame, setRatingGame] = useState<GameRecord | null>(null)
  const [markingTradeId, setMarkingTradeId] = useState<number | null>(null)

  useDocumentTitle("Collection · Board Game Shelf")

  const facets = useMemo(() => buildCollectionFacets(dataset?.games ?? []), [dataset?.games])

  const resolvedFilters = useMemo(
    () => ({
      ...filters,
      yearRange: filters.yearRange[0] === 1950 && dataset ? facets.years : filters.yearRange,
    }),
    [dataset, facets.years, filters]
  )

  const filteredGames = useMemo(() => {
    return sortDashboardGames((dataset?.games ?? []).filter((game) => matchesDashboardFilters(game, resolvedFilters)), resolvedFilters.sortBy)
  }, [dataset?.games, resolvedFilters])

  const hotList = filteredGames.filter((game) => game.cullScore >= 60)
  const unplayed = filteredGames.filter((game) => !game.playCount)
  const favorites = filteredGames.filter((game) => (game.userRating ?? 0) >= 8)

  if (!hydrated) {
    return <div className="p-10 text-sm text-muted-foreground">Hydrating collection...</div>
  }

  if (!dataset) {
    return <EmptyState title="No collection loaded yet" description="Load your collection from the setup page to unlock your shelf dashboard." />
  }

  const playsTracked = dataset.games[0]?.playsTracked ?? false
  const estimatedValue = dataset.games.reduce((sum, game) => sum + game.estimatedTradeValue, 0)

  async function handleMarkForTrade(game: GameRecord) {
    setMarkingTradeId(game.id)

    try {
      await updateCollectionStatus({ objectid: game.id, objecttype: "thing", fortrade: true })
      updateGame(game.id, { forTrade: true })
      toast.success(`${game.name} is now marked for trade on BGG.`)
    } catch (error) {
      handleBggError(error, "Unable to mark this game for trade.")
    } finally {
      setMarkingTradeId(null)
    }
  }

  function handleRated(rating: number) {
    if (!ratingGame) {
      return
    }

    updateGame(ratingGame.id, { userRating: rating })
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className={`flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm ${playsTracked ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200" : "border-amber-500/20 bg-amber-500/10 text-amber-200"}`}>
          <span className="font-medium">{playsTracked ? "📊 Play-weighted scoring" : "🎯 Rating-focused scoring"}</span>
          <span className="text-muted-foreground">
            {playsTracked
              ? "Play history detected — frequency and recency are weighted heavily in cull scores."
              : "No play logs detected — scores lean on your ratings, mechanic redundancy, and reacquisition risk instead."}
          </span>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard icon={<LibraryBig className="size-5" />} label="Collection size" value={dataset.games.length} hint="Owned base games only" />
          <SummaryCard icon={<Flame className="size-5" />} label="High cull fit" value={dataset.games.filter((game) => game.cullScore >= 75).length} hint="Score ≥ 75" />
          <SummaryCard icon={<Swords className="size-5" />} label="Average score" value={round(average(dataset.games.map((game) => game.cullScore)))} hint="Across the full shelf" />
          <SummaryCard icon={<Sparkles className="size-5" />} label="Decisions made" value={Object.keys(decisions).length} hint="Persisted to localStorage" />
          <SummaryCard icon={<Coins className="size-5" />} label="Shelf value" value={formatCurrency(estimatedValue)} hint="Estimated collection value" />
        </section>

        <FilterBar
          filters={resolvedFilters}
          onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
          onReset={() => setFilters({ ...defaultDashboardFilters, yearRange: facets.years })}
          facets={facets}
        />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Collection dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {filteredGames.length} games match your current filters. Start with the hot list, star your favorites, or jump straight into tonight’s shortlist.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline">
              <Link href="/results">View results</Link>
            </Button>
            <Button variant="outline">
              <Link href={buildPlayHref(resolvedFilters)}>Play tonight</Link>
            </Button>
            <Button>
              <Link href="/culler">
                Open culler
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="all">All games</TabsTrigger>
            <TabsTrigger value="hot">Cull hotlist</TabsTrigger>
            <TabsTrigger value="unplayed">Unplayed</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <GameGrid games={filteredGames} viewMode={resolvedFilters.viewMode} decisions={decisions} canWrite={isLoggedIn} markingTradeId={markingTradeId} onMarkForTrade={handleMarkForTrade} onRate={setRatingGame} />
          </TabsContent>
          <TabsContent value="hot">
            <GameGrid games={hotList} viewMode={resolvedFilters.viewMode} decisions={decisions} emptyMessage="No hot-list candidates match these filters." canWrite={isLoggedIn} markingTradeId={markingTradeId} onMarkForTrade={handleMarkForTrade} onRate={setRatingGame} />
          </TabsContent>
          <TabsContent value="unplayed">
            <GameGrid games={unplayed} viewMode={resolvedFilters.viewMode} decisions={decisions} emptyMessage="Every filtered game has been played at least once." canWrite={isLoggedIn} markingTradeId={markingTradeId} onMarkForTrade={handleMarkForTrade} onRate={setRatingGame} />
          </TabsContent>
          <TabsContent value="favorites">
            <GameGrid games={favorites} viewMode={resolvedFilters.viewMode} decisions={decisions} emptyMessage="No BGG favorites match these filters yet." canWrite={isLoggedIn} markingTradeId={markingTradeId} onMarkForTrade={handleMarkForTrade} onRate={setRatingGame} />
          </TabsContent>
        </Tabs>
      </div>

      <BggRateDialog game={ratingGame} open={Boolean(ratingGame)} onOpenChange={(open) => !open && setRatingGame(null)} onRated={handleRated} />
    </>
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
  canWrite,
  markingTradeId,
  onMarkForTrade,
  onRate,
}: {
  games: GameRecord[]
  viewMode: DashboardFilters["viewMode"]
  decisions: Record<string, string>
  emptyMessage?: string
  canWrite: boolean
  markingTradeId: number | null
  onMarkForTrade: (game: GameRecord) => void
  onRate: (game: GameRecord) => void
}) {
  if (!games.length) {
    return <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center text-sm text-muted-foreground">{emptyMessage}</div>
  }

  return (
    <div className={viewMode === "grid" ? "grid gap-5 md:grid-cols-2 xl:grid-cols-3" : "grid gap-5"}>
      {games.map((game) => (
        <GameCard
          key={game.id}
          game={game}
          viewMode={viewMode}
          decision={decisions[String(game.id)] as never}
          showPlayTime
          action={
            canWrite ? (
              <>
                <Button size="sm" variant={game.forTrade ? "secondary" : "outline"} disabled={Boolean(game.forTrade) || markingTradeId === game.id} onClick={() => onMarkForTrade(game)}>
                  {markingTradeId === game.id ? "Syncing..." : game.forTrade ? "Marked for trade" : "Mark for trade"}
                </Button>
                <Button size="sm" onClick={() => onRate(game)}>
                  Rate
                </Button>
              </>
            ) : undefined
          }
        />
      ))}
    </div>
  )
}

export default function CollectionPage() {
  return (
    <ClientOnly fallback={null}>
      <CollectionPageInner />
    </ClientOnly>
  )
}
