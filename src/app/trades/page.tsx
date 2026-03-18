"use client"

export const dynamic = "force-dynamic"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Copy, Download, RefreshCcw } from "lucide-react"
import { toast } from "sonner"

import { ClientOnly } from "@/components/client-only"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCollection } from "@/hooks/use-collection"
import { useDocumentTitle } from "@/hooks/use-document-title"
import type { CollectionItem, GameRecord } from "@/lib/types"
import { downloadFile, formatCurrency } from "@/lib/utils"

function TradesPageInner() {
  const { dataset, decisionGroups, hydrated } = useCollection()
  const searchParams = useSearchParams()
  const [tradeCollection, setTradeCollection] = useState<CollectionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState("value")

  useDocumentTitle("Trades · Board Game Shelf")

  useEffect(() => {
    async function loadTradeCollection() {
      if (!dataset?.username) {
        return
      }

      setLoading(true)
      try {
        const response = await fetch(`/api/collection?username=${encodeURIComponent(dataset.username)}&trade=1`)
        const payload = (await response.json()) as { items?: CollectionItem[]; error?: string }
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load BGG trade list")
        }
        setTradeCollection(payload.items ?? [])
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load BGG trade list.")
      } finally {
        setLoading(false)
      }
    }

    loadTradeCollection()
  }, [dataset?.username])

  const tradeGames = useMemo(() => {
    const bggTradeIds = new Set(tradeCollection.map((item) => item.id))
    const merged = new Map<number, GameRecord>()

    for (const game of decisionGroups.cull) {
      merged.set(game.id, game)
    }

    for (const game of dataset?.games ?? []) {
      if (bggTradeIds.has(game.id)) {
        merged.set(game.id, game)
      }
    }

    const list = [...merged.values()]

    return list.sort((left, right) => {
      switch (sortBy) {
        case "name":
          return left.name.localeCompare(right.name)
        case "score":
          return right.cullScore - left.cullScore
        case "value":
        default:
          return right.estimatedTradeValue - left.estimatedTradeValue
      }
    })
  }, [dataset?.games, decisionGroups.cull, sortBy, tradeCollection])

  const totalValue = tradeGames.reduce((sum, game) => sum + game.estimatedTradeValue, 0)
  const focusId = Number(searchParams.get("focus") ?? 0)

  if (!hydrated) {
    return <div className="p-10 text-sm text-muted-foreground">Preparing trade helper...</div>
  }

  if (!dataset) {
    return <EmptyState title="No collection loaded" description="Load your collection from the setup page to manage your trade pile." />
  }

  async function copyFormattedText() {
    const text = tradeGames.map((game) => `${game.name} (${game.yearPublished ?? "—"}) — ${formatCurrency(game.estimatedTradeValue)} — ${game.tradeUrl}`).join("\n")
    await navigator.clipboard.writeText(text)
    toast.success("Trade post text copied.")
  }

  async function copyGeekList() {
    const text = tradeGames.map((game) => `[*][thing=${game.id}]${game.name}[/thing] — ${formatCurrency(game.estimatedTradeValue)}`).join("\n")
    await navigator.clipboard.writeText(text)
    toast.success("GeekList format copied.")
  }

  function exportCsv() {
    const rows = [
      ["name", "bgg_id", "estimated_value", "bgg_link"],
      ...tradeGames.map((game) => [game.name, String(game.id), String(game.estimatedTradeValue), game.bggUrl]),
    ]
    downloadFile("board-game-shelf-trades.csv", rows.map((row) => row.join(",")).join("\n"), "text/csv;charset=utf-8")
    toast.success("Trade CSV exported.")
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Trade helper</h1>
          <p className="text-sm text-muted-foreground">Games you marked to cull plus anything already flagged for trade on BGG.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => window.location.reload()} disabled={loading}>
            <RefreshCcw className="size-4" />
            {loading ? "Refreshing..." : "Refresh BGG trade list"}
          </Button>
          <Button variant="outline">
            <Link href="/results">Open results</Link>
          </Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Trade pile" value={tradeGames.length} hint="Local culls + BGG trade list" />
        <MetricCard label="Total value" value={formatCurrency(totalValue)} hint="Estimated trade value" />
        <MetricCard label="BGG trade sync" value={tradeCollection.length} hint="Items currently marked for trade on BGG" />
      </section>

      <Card className="border-white/10 bg-card/75">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full max-w-xs">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value ?? "value")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="value">Estimated value</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="score">Cull score</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={copyFormattedText}>
              <Copy className="size-4" />
              Copy post text
            </Button>
            <Button variant="outline" onClick={copyGeekList}>
              <Copy className="size-4" />
              Copy GeekList
            </Button>
            <Button onClick={exportCsv}>
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {tradeGames.length ? (
        <div className="grid gap-4">
          {tradeGames.map((game) => (
            <Card key={game.id} className={`border-white/10 bg-card/75 ${focusId === game.id ? "ring-2 ring-primary/50" : ""}`}>
              <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-2xl bg-black/30">
                    {game.image || game.thumbnail ? <img src={game.image ?? game.thumbnail} alt={game.name} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">{game.name}</h2>
                      <Badge className="bg-primary/15 text-primary">{formatCurrency(game.estimatedTradeValue)}</Badge>
                      <Badge className="bg-white/8">Demand: {game.wantingCount ?? 0}</Badge>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{game.yearPublished ?? "Unknown year"} · Cull score {game.cullScore} · {game.marketListings ?? 0} current listings</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline">
                    <Link href={game.tradeUrl} target="_blank" rel="noreferrer">BGG marketplace</Link>
                  </Button>
                  <Button variant="outline">
                    <Link href={sellUrl(game.id)} target="_blank" rel="noreferrer">GeekMarket sell</Link>
                  </Button>
                  <Button>
                    <Link href={game.bggUrl} target="_blank" rel="noreferrer">BGG page</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-white/10 bg-card/75">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">No trade pile yet. Mark games as cull in the culler to see them here.</CardContent>
        </Card>
      )}
    </div>
  )
}

function MetricCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <Card className="border-white/10 bg-card/75">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
        <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

function sellUrl(gameId: number) {
  return `https://boardgamegeek.com/geekmarket/product/new?objecttype=thing&objectid=${gameId}`
}

export default function TradesPage() {
  return (
    <ClientOnly fallback={null}>
      <TradesPageInner />
    </ClientOnly>
  )
}
