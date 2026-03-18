"use client"

export const dynamic = "force-dynamic"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, RefreshCcw, Star } from "lucide-react"
import { toast } from "sonner"

import { ClientOnly } from "@/components/client-only"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCollection } from "@/hooks/use-collection"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { loadUsername, loadWishlistCache, saveWishlistCache } from "@/lib/storage"
import type { GameRecord, WishlistDataset, WishlistRecord } from "@/lib/types"
import { formatCurrency, round } from "@/lib/utils"

const sortOptions = [
  ["priority", "Priority"],
  ["rating", "BGG rating"],
  ["weight", "Weight"],
  ["name", "Name"],
] as const

function WishlistPageInner() {
  const { dataset, hydrated } = useCollection()
  const [wishlist, setWishlist] = useState<WishlistDataset | null>(null)
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState<(typeof sortOptions)[number][0]>("priority")
  const [playerFilter, setPlayerFilter] = useState("any")
  const [weightFilter, setWeightFilter] = useState("any")
  const [categoryFilter, setCategoryFilter] = useState("all")

  useDocumentTitle("Wishlist · Board Game Shelf")

  useEffect(() => {
    const username = dataset?.username ?? loadUsername()

    if (!username) {
      return
    }

    setWishlist(loadWishlistCache(username))
  }, [dataset?.username])

  const categories = useMemo(() => [...new Set(wishlist?.items.flatMap((item) => item.categories ?? []) ?? [])].sort(), [wishlist?.items])

  const items = useMemo(() => {
    const enriched = (wishlist?.items ?? []).map((item) => ({
      ...item,
      overlap: bestOverlap(item, dataset?.games ?? []),
    }))

    return enriched
      .filter((item) => {
        const playerMatch =
          playerFilter === "any"
            ? true
            : playerFilter === "8"
              ? Boolean(item.maxPlayers && item.maxPlayers >= 8)
              : Boolean(item.minPlayers && item.maxPlayers && Number(playerFilter) >= item.minPlayers && Number(playerFilter) <= item.maxPlayers)
        const weight = item.averageWeight ?? 0
        const weightMatch =
          weightFilter === "any"
            ? true
            : weightFilter === "light"
              ? weight >= 1 && weight <= 2
              : weightFilter === "medium"
                ? weight > 2 && weight <= 3.5
                : weight > 3.5
        const categoryMatch = categoryFilter === "all" || (item.categories ?? []).includes(categoryFilter)

        return playerMatch && weightMatch && categoryMatch
      })
      .sort((left, right) => {
        switch (sortBy) {
          case "name":
            return left.name.localeCompare(right.name)
          case "rating":
            return (right.averageRating ?? right.bggAverageRating ?? 0) - (left.averageRating ?? left.bggAverageRating ?? 0)
          case "weight":
            return (right.averageWeight ?? 0) - (left.averageWeight ?? 0)
          case "priority":
          default:
            return (left.wishlistPriority ?? 6) - (right.wishlistPriority ?? 6)
        }
      })
  }, [categoryFilter, dataset?.games, playerFilter, sortBy, weightFilter, wishlist?.items])

  async function loadWishlist() {
    const username = dataset?.username ?? loadUsername()

    if (!username) {
      toast.error("Load your collection first so wishlist data has a username to use.")
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/wishlist?username=${encodeURIComponent(username)}`)
      const payload = (await response.json()) as WishlistDataset | { error: string }

      if (!response.ok) {
        throw new Error("error" in payload ? payload.error : "Failed to load wishlist")
      }

      setWishlist(payload as WishlistDataset)
      saveWishlistCache(payload as WishlistDataset)
      toast.success(`Loaded ${(payload as WishlistDataset).items.length} wishlist games.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load wishlist.")
    } finally {
      setLoading(false)
    }
  }

  if (!hydrated) {
    return <div className="p-10 text-sm text-muted-foreground">Preparing wishlist...</div>
  }

  if (!dataset) {
    return <EmptyState title="No collection loaded" description="Load your collection from the setup page so wishlist overlap warnings have your shelf to compare against." />
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Wishlist manager</h1>
          <p className="text-sm text-muted-foreground">Pull your BGG wishlist, sort by priority, and spot overlap before you buy another deck builder.</p>
        </div>
        <Button onClick={loadWishlist} disabled={loading}>
          <RefreshCcw className="size-4" />
          {loading ? "Refreshing..." : wishlist ? "Refresh wishlist" : "Load wishlist"}
        </Button>
      </div>

      <Card className="border-white/10 bg-card/75">
        <CardContent className="grid gap-4 p-5 md:grid-cols-3 lg:grid-cols-4">
          <Select value={sortBy} onValueChange={(value) => setSortBy((value as typeof sortBy) ?? "priority")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={playerFilter} onValueChange={(value) => setPlayerFilter(value ?? "any")}>
            <SelectTrigger>
              <SelectValue placeholder="Players" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any players</SelectItem>
              {["1", "2", "3", "4", "5", "6", "7", "8"].map((value) => <SelectItem key={value} value={value}>{value === "8" ? "8+" : value}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={weightFilter} onValueChange={(value) => setWeightFilter(value ?? "any")}>
            <SelectTrigger>
              <SelectValue placeholder="Weight" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any weight</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="heavy">Heavy</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value ?? "all")}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!wishlist ? (
        <Card className="border-white/10 bg-card/75">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">Fetch your wishlist to see priorities, prices, and overlap warnings.</CardContent>
        </Card>
      ) : items.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <WishlistCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <Card className="border-white/10 bg-card/75">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">No wishlist games match these filters.</CardContent>
        </Card>
      )}
    </div>
  )
}

function WishlistCard({ item }: { item: WishlistRecord & { overlap: ReturnType<typeof bestOverlap> } }) {
  return (
    <Card className="overflow-hidden border-white/10 bg-card/75">
      <div className="aspect-[4/3] bg-black/30">
        {item.image || item.thumbnail ? <img src={item.image ?? item.thumbnail} alt={item.name} className="h-full w-full object-cover" /> : null}
      </div>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle>{item.name}</CardTitle>
          <PriorityBadge priority={item.wishlistPriority} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <Badge className="bg-white/8">BGG {round(item.averageRating ?? item.bggAverageRating ?? 0, 1)}</Badge>
          <Badge className="bg-white/8">Weight {round(item.averageWeight ?? 0, 1)}</Badge>
          <Badge className="bg-white/8">{item.minPlayers ?? "?"}-{item.maxPlayers ?? "?"} players</Badge>
          <Badge className="bg-white/8">{item.yearPublished ?? "—"}</Badge>
          <Badge className="bg-primary/15 text-primary">{item.estimatedPrice ? formatCurrency(item.estimatedPrice) : "No market price"}</Badge>
        </div>

        {item.overlap ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="size-4" />
              Similar to {item.overlap.gameName} you already own
            </div>
            <div className="mt-1 text-amber-100/80">Shared mechanics: {item.overlap.sharedMechanics.join(", ")}</div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {(item.categories ?? []).slice(0, 3).map((category) => <Badge key={category} className="bg-white/8 text-muted-foreground">{category}</Badge>)}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Link href={item.bggUrl} target="_blank" rel="noreferrer">View on BGG</Link>
          </Button>
          <Button>
            <Link href={item.bggUrl} target="_blank" rel="noreferrer">Move to owned on BGG</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function PriorityBadge({ priority }: { priority?: number | null }) {
  const value = priority && priority > 0 ? priority : 5

  return (
    <Badge className="bg-primary/15 text-primary">
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} className={index < 6 - value ? "size-3 fill-current" : "size-3 opacity-35"} />
      ))}
    </Badge>
  )
}

function bestOverlap(item: WishlistRecord, games: WishlistRecord[] | GameRecord[]) {
  const overlaps = games
    .map((owned) => {
      const sharedMechanics = (item.mechanics ?? []).filter((mechanic) => (owned.mechanics ?? []).includes(mechanic))

      return {
        gameId: owned.id,
        gameName: owned.name,
        sharedMechanics,
      }
    })
    .filter((result) => result.sharedMechanics.length >= 2)
    .sort((left, right) => right.sharedMechanics.length - left.sharedMechanics.length)

  return overlaps[0] ?? null
}

export default function WishlistPage() {
  return (
    <ClientOnly fallback={null}>
      <WishlistPageInner />
    </ClientOnly>
  )
}
