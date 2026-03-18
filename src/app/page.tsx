"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, DatabaseZap, Dice5, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { LoadingState } from "@/components/loading-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCollection } from "@/hooks/use-collection"
import { loadCollectionBundle } from "@/lib/load-collection"
import { loadUsername, saveUsername } from "@/lib/storage"
import type { LoadingStage } from "@/lib/types"
import { formatDate } from "@/lib/utils"

const highlights = [
  "Cull scoring balances plays, ratings, redundancy, weight, and reacquisition risk.",
  "Decision mode gives you quick keep / maybe / cull triage with swipe gestures.",
  "Everything stays local in your browser, with CSV export and shareable results.",
]

export default function HomePage() {
  const router = useRouter()
  const { dataset, importDataset } = useCollection()
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState<LoadingStage | null>(null)

  useEffect(() => {
    setUsername(loadUsername())
  }, [])

  const cachedSummary = useMemo(() => {
    if (!dataset) {
      return null
    }

    return {
      totalGames: dataset.games.length,
      cullCandidates: dataset.games.filter((game) => game.cullScore >= 60).length,
    }
  }, [dataset])

  async function handleLoadCollection() {
    if (!username.trim()) {
      toast.error("Enter your BoardGameGeek username first.")
      return
    }

    setLoading(true)
    saveUsername(username.trim())

    try {
      const nextDataset = await loadCollectionBundle(username.trim(), setStage, dataset?.username === username.trim() ? dataset : null)
      importDataset(nextDataset)
      toast.success(`Loaded ${nextDataset.games.length} games for ${username.trim()}.`)
      router.push("/dashboard")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load your collection.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Badge className="bg-primary/15 px-3 py-1 text-primary">
            <Sparkles className="mr-2 size-3" />
            Dark mode by default. Data local by design.
          </Badge>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
              Decide which board games deserve shelf space.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Pull your BGG collection, score every game for cull-worthiness, and work through the pile with a tactile collector-first workflow.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {highlights.map((item, index) => (
              <Card key={item} className="border-white/10 bg-card/60">
                <CardContent className="p-5 text-sm text-muted-foreground">
                  <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    {index === 0 ? <DatabaseZap className="size-5" /> : <Dice5 className="size-5" />}
                  </div>
                  {item}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {loading ? (
            <LoadingState stage={stage} />
          ) : (
            <Tabs defaultValue="sync" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sync">Fresh sync</TabsTrigger>
                <TabsTrigger value="cached">Cached collection</TabsTrigger>
              </TabsList>
              <TabsContent value="sync">
                <Card className="border-white/10 bg-card/75 shadow-2xl shadow-black/20">
                  <CardHeader>
                    <CardTitle>Load your BGG collection</CardTitle>
                    <CardDescription>We fetch owned base games, detail stats, and play history through server-side API routes.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">BoardGameGeek username</label>
                      <Input placeholder="e.g. colewerq" value={username} onChange={(event) => setUsername(event.target.value)} />
                    </div>
                    <Button className="w-full justify-center" onClick={handleLoadCollection}>
                      Load collection
                      <ArrowRight className="size-4" />
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Uses `process.env.BGG_API_KEY` in the API layer, retries queued collection requests, and caches results in localStorage.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="cached">
                <Card className="border-white/10 bg-card/75 shadow-2xl shadow-black/20">
                  <CardHeader>
                    <CardTitle>Resume from cache</CardTitle>
                    <CardDescription>Use your last synced shelf instantly, or kick off a fresh import to compare changes.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {dataset && cachedSummary ? (
                      <>
                        <div className="rounded-3xl border border-white/10 bg-background/60 p-5">
                          <div className="text-lg font-medium">{dataset.username}</div>
                          <div className="mt-2 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                            <div>{cachedSummary.totalGames} total games</div>
                            <div>{cachedSummary.cullCandidates} hot cull candidates</div>
                            <div>Last sync {formatDate(dataset.loadedAt)}</div>
                            <div>{dataset.previousLoadedAt ? `Previous sync ${formatDate(dataset.previousLoadedAt)}` : "First import"}</div>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Button className="flex-1" onClick={() => router.push("/dashboard")}>Open dashboard</Button>
                          <Button variant="outline" className="flex-1" onClick={handleLoadCollection}>
                            Refresh data
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
                        No cached shelf yet. Run a fresh sync first.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <LinkCard href="/dashboard" title="Dashboard" description="Explore the full collection, sort by cull score, and slice by filters." />
        <LinkCard href="/decide" title="Decision mode" description="Go card-by-card with swipe gestures and a score breakdown." />
        <LinkCard href="/results" title="Results + export" description="Review keep / maybe / cull groups, export CSV, and share a link." />
      </section>
    </div>
  )
}

function LinkCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="group rounded-3xl border border-white/10 bg-card/60 p-5 transition hover:border-primary/30 hover:bg-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
    </Link>
  )
}
