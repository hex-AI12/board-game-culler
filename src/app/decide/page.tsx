"use client"

export const dynamic = "force-dynamic"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, RefreshCcw } from "lucide-react"

import { DecisionCard } from "@/components/decision-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ClientOnly } from "@/components/client-only"
import { useCollection } from "@/hooks/use-collection"
import type { Decision } from "@/lib/types"

function DecidePageInner() {
  const { dataset, decisions, hydrated, reviewedCount, setDecision } = useCollection()
  const [queue, setQueue] = useState<number[]>([])
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!dataset) {
      return
    }

    setQueue(dataset.games.filter((game) => !decisions[String(game.id)]).map((game) => game.id))
  }, [dataset, decisions])

  const game = useMemo(() => dataset?.games.find((item) => item.id === queue[0]) ?? null, [dataset?.games, queue])

  if (!hydrated) {
    return <div className="p-10 text-sm text-muted-foreground">Preparing decision mode...</div>
  }

  if (!dataset) {
    return (
      <EmptyState title="No collection loaded" description="Pull your BGG shelf first, then come back for swipe-style triage." href="/" cta="Go to setup" />
    )
  }

  if (!game) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16 text-center sm:px-6">
        <Card className="border-white/10 bg-card/75">
          <CardContent className="space-y-5 p-10">
            <h1 className="text-3xl font-semibold">Decision pass complete</h1>
            <p className="text-muted-foreground">You reviewed every game in the current collection. Head to results, or refresh the queue to walk through the undecided pile again.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={() => setQueue(dataset.games.map((item) => item.id))}>
                <RefreshCcw className="size-4" />
                Review all again
              </Button>
              <Button>
                <Link href="/results">See results <ArrowRight className="size-4" /></Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
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
          <h1 className="text-3xl font-semibold">Tinder-style decision mode</h1>
          <p className="text-sm text-muted-foreground">Swipe right to keep, left to cull, and up to mark maybe on touch devices.</p>
        </div>
        <Button variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>

      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <DecisionCard game={game} reviewedCount={reviewedCount} total={dataset.games.length} onDecide={handleDecision} onSkip={handleSkip} />
      </div>
    </div>
  )
}

function EmptyState({ title, description, href, cta }: { title: string; description: string; href: string; cta: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-3 text-muted-foreground">{description}</p>
      <Button className="mt-6">
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  )
}

export default function DecidePage() {
  return <ClientOnly fallback={null}><DecidePageInner /></ClientOnly>
}
