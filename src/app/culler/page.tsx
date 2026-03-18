"use client"

export const dynamic = "force-dynamic"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, RefreshCcw } from "lucide-react"

import { ClientOnly } from "@/components/client-only"
import { DecisionCard } from "@/components/decision-card"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCollection } from "@/hooks/use-collection"
import { useDocumentTitle } from "@/hooks/use-document-title"
import type { Decision } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"

function CullerPageInner() {
  const { dataset, decisions, hydrated, reviewedCount, setDecision } = useCollection()
  const [queue, setQueue] = useState<number[]>([])
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  useDocumentTitle("Culler · Board Game Shelf")

  useEffect(() => {
    if (!dataset) {
      return
    }

    setQueue(dataset.games.filter((game) => !decisions[String(game.id)]).map((game) => game.id))
  }, [dataset, decisions])

  const game = useMemo(() => dataset?.games.find((item) => item.id === queue[0]) ?? null, [dataset?.games, queue])
  const quickCullGames = useMemo(() => [...(dataset?.games ?? [])].sort((left, right) => right.cullScore - left.cullScore), [dataset?.games])

  if (!hydrated) {
    return <div className="p-10 text-sm text-muted-foreground">Preparing culler...</div>
  }

  if (!dataset) {
    return <EmptyState title="No collection loaded" description="Load your collection from the setup page to start culling." />
  }

  function handleDecision(decision: Decision) {
    if (!game) return
    setDecision(game.id, decision)
    setQueue((current) => current.slice(1))
  }

  function handleSkip() {
    setQueue((current) => (current.length <= 1 ? current : [...current.slice(1), current[0]]))
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (!touchStart.current) {
      return
    }

    const touch = event.changedTouches[0]
    const deltaX = touch.clientX - touchStart.current.x
    const deltaY = touch.clientY - touchStart.current.y
    touchStart.current = null

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 90) {
      handleDecision(deltaX > 0 ? "keep" : "cull")
      return
    }

    if (deltaY < -90) {
      handleDecision("maybe")
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Shelf culler</h1>
          <p className="text-sm text-muted-foreground">Swipe right to keep, left to cull, up for maybe — or switch to Quick Cull when you want a full-table pass.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Link href="/collection">Back to collection</Link>
          </Button>
          <Button variant="outline">
            <Link href="/trades">Open trades</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="swipe" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="swipe">Swipe mode</TabsTrigger>
          <TabsTrigger value="quick">Quick Cull</TabsTrigger>
        </TabsList>

        <TabsContent value="swipe" className="space-y-4">
          {game ? (
            <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              <DecisionCard game={game} reviewedCount={reviewedCount} total={dataset.games.length} onDecide={handleDecision} onSkip={handleSkip} />
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-6 py-8 text-center sm:px-6">
              <Card className="border-white/10 bg-card/75">
                <CardContent className="space-y-5 p-10">
                  <h2 className="text-3xl font-semibold">Decision pass complete</h2>
                  <p className="text-muted-foreground">You reviewed every game in the current collection. Head to results, the trades page, or run another pass from the top.</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button variant="outline" onClick={() => setQueue(dataset.games.map((item) => item.id))}>
                      <RefreshCcw className="size-4" />
                      Review all again
                    </Button>
                    <Button>
                      <Link href="/results">
                        See results
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="quick">
          <Card className="border-white/10 bg-card/75">
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Quick Cull table</h2>
                  <p className="text-sm text-muted-foreground">Sort by score, assign Keep / Maybe / Cull inline, and jump straight to the trade helper for moved games.</p>
                </div>
                <div className="text-sm text-muted-foreground">{reviewedCount}/{dataset.games.length} reviewed</div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                    <tr className="border-b border-white/10">
                      <th className="px-3 py-3">Game</th>
                      <th className="px-3 py-3">Cull score</th>
                      <th className="px-3 py-3">Rating</th>
                      <th className="px-3 py-3">Trade est.</th>
                      <th className="px-3 py-3">Decision</th>
                      <th className="px-3 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quickCullGames.map((item) => {
                      const currentDecision = decisions[String(item.id)]

                      return (
                        <tr key={item.id} className="border-b border-white/6 align-top">
                          <td className="px-3 py-4">
                            <div className="font-medium text-foreground">{item.name}</div>
                            <div className="text-xs text-muted-foreground">{item.yearPublished ?? "Unknown year"} · {item.minPlayers ?? "?"}-{item.maxPlayers ?? "?"} players</div>
                          </td>
                          <td className="px-3 py-4">{item.cullScore}</td>
                          <td className="px-3 py-4">{item.userRating ?? "—"}</td>
                          <td className="px-3 py-4">{formatCurrency(item.estimatedTradeValue)}</td>
                          <td className="px-3 py-4 capitalize">{currentDecision ?? "Undecided"}</td>
                          <td className="px-3 py-4">
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant={currentDecision === "keep" ? "secondary" : "outline"} onClick={() => setDecision(item.id, "keep")}>Keep</Button>
                              <Button size="sm" variant={currentDecision === "maybe" ? "secondary" : "outline"} onClick={() => setDecision(item.id, "maybe")}>Maybe</Button>
                              <Button size="sm" variant={currentDecision === "cull" ? "destructive" : "outline"} onClick={() => setDecision(item.id, "cull")}>Cull</Button>
                              {currentDecision === "cull" ? (
                                <Button size="sm">
                                  <Link href={`/trades?focus=${item.id}`}>Trade page</Link>
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function CullerPage() {
  return (
    <ClientOnly fallback={null}>
      <CullerPageInner />
    </ClientOnly>
  )
}
