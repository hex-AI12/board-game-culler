"use client"

export const dynamic = "force-dynamic"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Copy, Download, Link2, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { CullScoreBadge } from "@/components/cull-score-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClientOnly } from "@/components/client-only"
import { useCollection } from "@/hooks/use-collection"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { decodeSharePayload, encodeSharePayload } from "@/lib/storage"
import type { Decision, GameRecord, SharedResultsPayload } from "@/lib/types"
import { downloadFile, formatCurrency } from "@/lib/utils"

function ResultsPageInner() {
  const searchParams = useSearchParams()
  const { dataset, decisions, resetDecisions, decisionGroups } = useCollection()
  const [dialogOpen, setDialogOpen] = useState(false)

  useDocumentTitle("Results · Board Game Shelf")

  const sharedPayload = useMemo(() => {
    const share = searchParams.get("share")
    return share ? decodeSharePayload(share) : null
  }, [searchParams])

  const resultGroups = useMemo(() => {
    if (sharedPayload) {
      return {
        keep: sharedPayload.items.filter((item) => item.decision === "keep"),
        maybe: sharedPayload.items.filter((item) => item.decision === "maybe"),
        cull: sharedPayload.items.filter((item) => item.decision === "cull"),
      }
    }

    return decisionGroups
  }, [decisionGroups, sharedPayload])

  const summary = {
    keep: resultGroups.keep.length,
    maybe: resultGroups.maybe.length,
    cull: resultGroups.cull.length,
  }

  if (!dataset && !sharedPayload) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-3xl font-semibold">No results yet</h1>
        <p className="mt-3 text-muted-foreground">Make some keep / maybe / cull decisions first, then come back for exports and a sell list.</p>
        <Button className="mt-6">
          <Link href="/culler">Start culling</Link>
        </Button>
      </div>
    )
  }

  function exportCsv() {
    const decidedGames = dataset?.games.filter((game) => decisions[String(game.id)]) ?? []
    const rows = [
      ["name", "bgg_link", "your_rating", "cull_score", "decision"],
      ...decidedGames.map((game) => [game.name, game.bggUrl, game.userRating ?? "", game.cullScore, decisions[String(game.id)]]),
    ]
    downloadFile("board-game-shelf-results.csv", rows.map((row) => row.join(",")).join("\n"), "text/csv;charset=utf-8")
    toast.success("CSV exported.")
  }

  async function copyShareLink() {
    if (!dataset) {
      return
    }

    const payload: SharedResultsPayload = {
      username: dataset.username,
      generatedAt: new Date().toISOString(),
      items: dataset.games
        .filter((game) => decisions[String(game.id)])
        .map((game) => ({
          id: game.id,
          name: game.name,
          bggUrl: game.bggUrl,
          tradeUrl: game.tradeUrl,
          yourRating: game.userRating,
          cullScore: game.cullScore,
          estimatedTradeValue: game.estimatedTradeValue,
          decision: decisions[String(game.id)] as Decision,
        })),
    }

    const shareUrl = `${window.location.origin}/results?share=${encodeURIComponent(encodeSharePayload(payload))}`
    await navigator.clipboard.writeText(shareUrl)
    toast.success("Share link copied.")
  }

  async function copyCullList() {
    const lines = resultGroups.cull.map((item) => `${item.name} — ${formatCurrency(item.estimatedTradeValue)} — ${item.tradeUrl}`)
    await navigator.clipboard.writeText(lines.join("\n"))
    toast.success("Cull list copied.")
  }

  const totalValue = resultGroups.cull.reduce((sum, item) => sum + item.estimatedTradeValue, 0)

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm uppercase tracking-wide text-primary">Results & export</div>
          <h1 className="text-3xl font-semibold">{sharedPayload ? `${sharedPayload.username}'s shared shortlist` : "Your cull plan"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Keep the favorites, review the maybes, and prep the cull pile for trade or sale.</p>
        </div>
        {!sharedPayload ? (
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={copyShareLink}>
              <Link2 className="size-4" />
              Copy share link
            </Button>
            <Button variant="outline" onClick={copyCullList}>
              <Copy className="size-4" />
              Copy cull list
            </Button>
            <Button onClick={exportCsv}>
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>
        ) : null}
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Keep" value={summary.keep} hint="Safe from the cull" />
        <MetricCard label="Maybe" value={summary.maybe} hint="Needs one more pass" />
        <MetricCard label="Cull" value={summary.cull} hint="Ready to move on" />
        <MetricCard label="Cull value" value={formatCurrency(totalValue)} hint="Estimated trade value" />
      </section>

      <Tabs defaultValue="cull" className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="cull">Cull pile</TabsTrigger>
          <TabsTrigger value="maybe">Maybe</TabsTrigger>
          <TabsTrigger value="keep">Keep</TabsTrigger>
        </TabsList>
        <TabsContent value="cull">
          <DecisionList items={resultGroups.cull} emptyMessage="No cull picks yet." showTradeValue />
        </TabsContent>
        <TabsContent value="maybe">
          <DecisionList items={resultGroups.maybe} emptyMessage="No maybes yet." />
        </TabsContent>
        <TabsContent value="keep">
          <DecisionList items={resultGroups.keep} emptyMessage="No keeps yet." />
        </TabsContent>
      </Tabs>

      {!sharedPayload ? (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button variant="ghost"><RotateCcw className="size-4" />Reset decisions</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset all saved decisions?</DialogTitle>
            </DialogHeader>
            <div className="px-6 py-4">
              This clears keep / maybe / cull choices from localStorage for the current collection but leaves the imported BGG data intact.
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  resetDecisions()
                  setDialogOpen(false)
                  toast.success("Decisions reset.")
                }}
              >
                Confirm reset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}

function MetricCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <Card className="border-white/10 bg-card/70">
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

function DecisionList({
  items,
  emptyMessage,
  showTradeValue = false,
}: {
  items: Array<GameRecord | SharedResultsPayload["items"][number]>
  emptyMessage: string
  showTradeValue?: boolean
}) {
  if (!items.length) {
    return <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center text-sm text-muted-foreground">{emptyMessage}</div>
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <Card key={item.id} className="border-white/10 bg-card/70">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <h3 className="text-lg font-semibold">{item.name}</h3>
                <CullScoreBadge score={item.cullScore} />
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                {"yourRating" in item && item.yourRating ? <Badge className="bg-white/8">Your rating {item.yourRating}/10</Badge> : null}
                {showTradeValue ? <Badge className="bg-primary/15 text-primary">{formatCurrency(item.estimatedTradeValue)} est. trade</Badge> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline">
                <Link href={item.bggUrl} target="_blank" rel="noreferrer">BGG page</Link>
              </Button>
              {showTradeValue ? (
                <Button>
                  <Link href={item.tradeUrl} target="_blank" rel="noreferrer">Trade listing</Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function ResultsPage() {
  return <ClientOnly fallback={null}><ResultsPageInner /></ClientOnly>
}
