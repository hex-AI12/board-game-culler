"use client"

export const dynamic = "force-dynamic"

import Link from "next/link"
import { ArrowUpRight, BarChart3, Coins, Star, Users } from "lucide-react"

import { ClientOnly } from "@/components/client-only"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCollection } from "@/hooks/use-collection"
import { useDocumentTitle } from "@/hooks/use-document-title"
import type { GameRecord } from "@/lib/types"
import { average, formatCurrency, round } from "@/lib/utils"

const weightBands: Array<[number, number]> = [
  [1, 1.5],
  [1.5, 2],
  [2, 2.5],
  [2.5, 3],
  [3, 3.5],
  [3.5, 4],
  [4, 4.5],
  [4.5, 5],
]

function StatsPageInner() {
  const { dataset, hydrated } = useCollection()

  useDocumentTitle("Stats · Board Game Shelf")

  if (!hydrated) {
    return <div className="p-10 text-sm text-muted-foreground">Crunching your stats...</div>
  }

  if (!dataset) {
    return <EmptyState title="No collection loaded" description="Load your collection from the setup page to unlock shelf analytics." />
  }

  const games = dataset.games
  const years = games.map((game) => game.yearPublished).filter(Boolean) as number[]
  const totalValue = games.reduce((sum, game) => sum + game.estimatedTradeValue, 0)
  const averageBggRating = average(games.map((game) => game.averageRating ?? game.bggAverageRating ?? 0).filter(Boolean))
  const averageWeight = average(games.map((game) => game.averageWeight ?? 0).filter(Boolean))

  const weightDistribution = weightBands.map(([min, max]) => ({
    label: `${min.toFixed(1)}-${max.toFixed(1)}`,
    count: games.filter((game) => (game.averageWeight ?? 0) >= min && (game.averageWeight ?? 0) < max).length,
  }))
  const sweetSpot = [...weightDistribution].sort((left, right) => right.count - left.count)[0]
  const lightOutliers = games.filter((game) => (game.averageWeight ?? 0) <= 1.3).slice(0, 3)
  const heavyOutliers = games.filter((game) => (game.averageWeight ?? 0) >= 4.4).slice(0, 3)

  const playerCoverage = [1, 2, 3, 4, 5, 6, 7, 8].map((count) => ({
    label: count === 8 ? "8+" : String(count),
    count: games.filter((game) => (count === 8 ? (game.maxPlayers ?? 0) >= 8 : (game.minPlayers ?? 0) <= count && (game.maxPlayers ?? 0) >= count)).length,
  }))
  const playerGaps = playerCoverage.filter((item) => item.count <= 2)

  const mechanics = countTerms(games.flatMap((game) => game.mechanics ?? [])).slice(0, 15)
  const categories = countTerms(games.flatMap((game) => game.categories ?? [])).slice(0, 15)
  const topMechanic = mechanics[0]
  const topCategory = categories[0]

  const ratingDistribution = Array.from({ length: 10 }, (_, index) => index + 1).map((rating) => ({
    label: String(rating),
    count: games.filter((game) => Math.round(game.userRating ?? 0) === rating).length,
  }))
  const unratedCount = games.filter((game) => !game.userRating).length
  const averagePersonalRating = average(games.map((game) => game.userRating ?? 0).filter(Boolean))

  const topLists = {
    personal: [...games].filter((game) => game.userRating).sort((left, right) => (right.userRating ?? 0) - (left.userRating ?? 0)).slice(0, 10),
    bgg: [...games].sort((left, right) => (right.averageRating ?? right.bggAverageRating ?? 0) - (left.averageRating ?? left.bggAverageRating ?? 0)).slice(0, 10),
    heavy: [...games].sort((left, right) => (right.averageWeight ?? 0) - (left.averageWeight ?? 0)).slice(0, 10),
    light: [...games].sort((left, right) => (left.averageWeight ?? 0) - (right.averageWeight ?? 0)).slice(0, 10),
    players: [...games].sort((left, right) => (right.maxPlayers ?? 0) - (left.maxPlayers ?? 0)).slice(0, 10),
    newest: [...games].sort((left, right) => (right.yearPublished ?? 0) - (left.yearPublished ?? 0)).slice(0, 10),
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Stats & insights</h1>
          <p className="text-sm text-muted-foreground">Client-side analytics for your shelf — no chart library, just clean bars and useful callouts.</p>
        </div>
        <Button variant="outline">
          <Link href="/collection">Back to collection</Link>
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={<Users className="size-4" />} label="Total games" value={games.length} hint="Owned shelf size" />
        <MetricCard icon={<Coins className="size-4" />} label="Total value" value={formatCurrency(totalValue)} hint="Estimated trade value" />
        <MetricCard icon={<Star className="size-4" />} label="Avg. BGG rating" value={round(averageBggRating, 1)} hint="Community score" />
        <MetricCard icon={<BarChart3 className="size-4" />} label="Avg. weight" value={round(averageWeight, 1)} hint="Shelf complexity" />
        <MetricCard icon={<ArrowUpRight className="size-4" />} label="Year range" value={years.length ? `${Math.min(...years)}-${Math.max(...years)}` : "—"} hint="Oldest to newest" />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Weight distribution" description={`Sweet spot: ${sweetSpot?.label ?? "—"} (${sweetSpot?.count ?? 0} games)`}>
          <BarList items={weightDistribution} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Callout title="Light outliers" items={lightOutliers.map((game) => game.name)} empty="No featherweights" />
            <Callout title="Heavy outliers" items={heavyOutliers.map((game) => game.name)} empty="No ultra-heavy games" />
          </div>
        </SectionCard>

        <SectionCard title="Player count coverage" description="How well your shelf supports different table sizes.">
          <BarList items={playerCoverage} />
          <div className="flex flex-wrap gap-2">
            {playerGaps.length ? playerGaps.map((item) => <Badge key={item.label} className="bg-amber-500/15 text-amber-200">Gap: {item.label} players ({item.count})</Badge>) : <Badge className="bg-emerald-500/15 text-emerald-200">No obvious player-count gaps</Badge>}
          </div>
        </SectionCard>

        <SectionCard title="Mechanic breakdown" description={topMechanic ? `Most represented: ${topMechanic.label} (${topMechanic.count})` : "No mechanic data yet."}>
          <BarList items={mechanics} />
          {topMechanic ? <p className="text-sm text-muted-foreground">You have {topMechanic.count} games using {topMechanic.label.toLowerCase()}.</p> : null}
        </SectionCard>

        <SectionCard title="Category spread" description={topCategory ? `Most represented: ${topCategory.label} (${topCategory.count})` : "No category data yet."}>
          <BarList items={categories} />
          {topCategory ? <p className="text-sm text-muted-foreground">Your shelf leans hardest into {topCategory.label.toLowerCase()} games.</p> : null}
        </SectionCard>

        <SectionCard title="Rating distribution" description={`Average personal rating ${round(averagePersonalRating, 1)} vs BGG ${round(averageBggRating, 1)}`}>
          <BarList items={[...ratingDistribution, { label: "Unrated", count: unratedCount }]} />
        </SectionCard>

        <SectionCard title="Top 10 lists" description="Six quick ways to understand the shape of your shelf.">
          <div className="grid gap-4 md:grid-cols-2">
            <TopList title="Highest rated by you" items={topLists.personal} value={(game) => `${round(game.userRating ?? 0, 1)}/10`} />
            <TopList title="Highest rated by BGG" items={topLists.bgg} value={(game) => `${round(game.averageRating ?? game.bggAverageRating ?? 0, 1)}/10`} />
            <TopList title="Heaviest games" items={topLists.heavy} value={(game) => `${round(game.averageWeight ?? 0, 1)}`} />
            <TopList title="Lightest games" items={topLists.light} value={(game) => `${round(game.averageWeight ?? 0, 1)}`} />
            <TopList title="Most players supported" items={topLists.players} value={(game) => `${game.maxPlayers ?? "?"} max`} />
            <TopList title="Newest additions" items={topLists.newest} value={(game) => `${game.yearPublished ?? "—"}`} />
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string | number; hint: string }) {
  return (
    <Card className="border-white/10 bg-card/75">
      <CardContent className="space-y-3 p-5">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">{icon}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-3xl font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  )
}

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="border-white/10 bg-card/75">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

function BarList({ items }: { items: Array<{ label: string; count: number }> }) {
  const max = Math.max(...items.map((item) => item.count), 1)

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span>{item.label}</span>
            <span className="text-muted-foreground">{item.count}</span>
          </div>
          <div className="h-2 rounded-full bg-white/8">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function TopList({ title, items, value }: { title: string; items: GameRecord[]; value: (game: GameRecord) => string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-background/50 p-4">
      <div className="mb-3 text-sm font-semibold">{title}</div>
      <div className="space-y-2 text-sm">
        {items.map((game, index) => (
          <div key={`${title}-${game.id}`} className="flex items-center justify-between gap-3">
            <span className="truncate text-muted-foreground">{index + 1}. {game.name}</span>
            <span className="shrink-0 font-medium text-foreground">{value(game)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Callout({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-background/50 p-4 text-sm">
      <div className="mb-2 font-semibold">{title}</div>
      <div className="text-muted-foreground">{items.length ? items.join(", ") : empty}</div>
    </div>
  )
}

function countTerms(items: string[]) {
  const counts = new Map<string, number>()

  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1)
  }

  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((left, right) => right.count - left.count)
}

export default function StatsPage() {
  return (
    <ClientOnly fallback={null}>
      <StatsPageInner />
    </ClientOnly>
  )
}
