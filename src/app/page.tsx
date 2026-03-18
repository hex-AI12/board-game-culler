"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, BarChart3, DatabaseZap, HeartHandshake, LibraryBig, ListCollapse, Sparkles, WandSparkles } from "lucide-react"
import { toast } from "sonner"

import { LoadingState } from "@/components/loading-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCollection } from "@/hooks/use-collection"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { loadCollectionBundle } from "@/lib/load-collection"
import { loadUsername, saveUsername } from "@/lib/storage"
import type { LoadingStage } from "@/lib/types"
import { formatCurrency, formatDate } from "@/lib/utils"

const highlights = [
  {
    icon: <LibraryBig className="size-5" />,
    text: "Sync your BGG collection, keep it cached locally, and browse the whole shelf with score-aware filters.",
  },
  {
    icon: <WandSparkles className="size-5" />,
    text: "Pick tonight’s game with quick filters, a spinner wheel, and head-to-head bracket rounds.",
  },
  {
    icon: <ListCollapse className="size-5" />,
    text: "Cull with swipe cards or a fast table mode, then turn those decisions into a clean trade pile.",
  },
]

const featureLinks = [
  { href: "/collection", title: "Collection", description: "Browse, filter, sort, and value your full shelf.", icon: <LibraryBig className="size-4" /> },
  { href: "/play", title: "Play", description: "Game Night Picker with spinner and head-to-head picks.", icon: <WandSparkles className="size-4" /> },
  { href: "/culler", title: "Culler", description: "Swipe triage plus a quick-cull table for bulk decisions.", icon: <ListCollapse className="size-4" /> },
  { href: "/stats", title: "Stats", description: "Shelf analytics, bar charts, top 10s, and collection gaps.", icon: <BarChart3 className="size-4" /> },
  { href: "/wishlist", title: "Wishlist", description: "See wishlist overlap warnings and priority picks from BGG.", icon: <Sparkles className="size-4" /> },
  { href: "/trades", title: "Trades", description: "Manage your trade pile, export posts, and track value.", icon: <HeartHandshake className="size-4" /> },
]

export default function HomePage() {
  const router = useRouter()
  const { dataset, importDataset } = useCollection()
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState<LoadingStage | null>(null)

  useDocumentTitle("Board Game Shelf")

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
      totalValue: dataset.games.reduce((sum, game) => sum + game.estimatedTradeValue, 0),
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
      router.push("/collection")
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
            Board Game Shelf · Your collection, sorted.
          </Badge>
          <div className="space-y-4">
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
              Manage your whole board game shelf in one place.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Pull your BGG collection, find what to play tonight, analyze the shape of your shelf, work the cull pile, track your wishlist, and prep trades without leaving the app.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {highlights.map((item) => (
              <Card key={item.text} className="border-white/10 bg-card/60">
                <CardContent className="p-5 text-sm text-muted-foreground">
                  <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">{item.icon}</div>
                  {item.text}
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
                <TabsTrigger value="cached">Cached shelf</TabsTrigger>
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
                      Load shelf
                      <ArrowRight className="size-4" />
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Uses `process.env.BGG_API_KEY` in the API layer, retries queued collection requests, and caches everything locally after the first load.
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
                            <div>{formatCurrency(cachedSummary.totalValue)} estimated value</div>
                            <div>Last sync {formatDate(dataset.loadedAt)}</div>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Button className="flex-1" onClick={() => router.push("/collection")}>Open collection</Button>
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {featureLinks.map((item) => (
          <LinkCard key={item.href} href={item.href} title={item.title} description={item.description} icon={item.icon} />
        ))}
      </section>
    </div>
  )
}

function LinkCard({ href, title, description, icon }: { href: string; title: string; description: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="group rounded-3xl border border-white/10 bg-card/60 p-5 transition hover:border-primary/30 hover:bg-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">{icon}</div>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
    </Link>
  )
}
