"use client"

export const dynamic = "force-dynamic"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronDown, Dices, Swords, WandSparkles } from "lucide-react"
import { useSearchParams } from "next/navigation"

import { BggLogPlayDialog } from "@/components/bgg-log-play-dialog"
import { ClientOnly } from "@/components/client-only"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useBggSession } from "@/hooks/use-bgg-session"
import { useCollection } from "@/hooks/use-collection"
import { useDocumentTitle } from "@/hooks/use-document-title"
import type { GameRecord } from "@/lib/types"
import { cn, round } from "@/lib/utils"

const playerOptions = ["1", "2", "3", "4", "5", "6", "7", "8"]
const timeOptions = [
  { key: "any", label: "Any" },
  { key: "quick", label: "Quick (<30m)" },
  { key: "standard", label: "Standard (30-90m)" },
  { key: "epic", label: "Epic (90m+)" },
] as const
const weightOptions = [
  { key: "any", label: "Any" },
  { key: "light", label: "Light" },
  { key: "medium", label: "Medium" },
  { key: "heavy", label: "Heavy" },
] as const
const wheelColors = ["#8b5cf6", "#06b6d4", "#22c55e", "#eab308", "#f97316", "#ef4444", "#ec4899", "#6366f1"]

function PlayPageInner() {
  const { dataset, hydrated } = useCollection()
  const { isLoggedIn } = useBggSession()
  const searchParams = useSearchParams()
  const [players, setPlayers] = useState("any")
  const [timeFilter, setTimeFilter] = useState<(typeof timeOptions)[number]["key"]>("any")
  const [weightFilter, setWeightFilter] = useState<(typeof weightOptions)[number]["key"]>("any")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedMechanic, setSelectedMechanic] = useState("all")
  const [expandedFilters, setExpandedFilters] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [selectedSpinGame, setSelectedSpinGame] = useState<GameRecord | null>(null)
  const [selectedGame, setSelectedGame] = useState<GameRecord | null>(null)
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  const [roundGames, setRoundGames] = useState<GameRecord[]>([])
  const [roundWinners, setRoundWinners] = useState<GameRecord[]>([])
  const [pairIndex, setPairIndex] = useState(0)
  const [roundNumber, setRoundNumber] = useState(1)
  const [champion, setChampion] = useState<GameRecord | null>(null)

  useDocumentTitle("Play · Board Game Shelf")

  useEffect(() => {
    setPlayers(searchParams.get("players") ?? "any")
    setWeightFilter((searchParams.get("weight") as (typeof weightOptions)[number]["key"]) ?? "any")
    setSelectedCategory(searchParams.get("category") ?? "all")
    setSelectedMechanic(searchParams.get("mechanic") ?? "all")
  }, [searchParams])

  const categories = useMemo(() => [...new Set(dataset?.games.flatMap((game) => game.categories ?? []) ?? [])].slice(0, 18), [dataset?.games])
  const mechanics = useMemo(() => [...new Set(dataset?.games.flatMap((game) => game.mechanics ?? []) ?? [])].slice(0, 18), [dataset?.games])

  const filteredGames = useMemo(() => {
    return [...(dataset?.games ?? [])]
      .filter((game) => {
        const matchesPlayers =
          players === "any"
            ? true
            : players === "8"
              ? Boolean(game.maxPlayers && game.maxPlayers >= 8)
              : Boolean(game.minPlayers && game.maxPlayers && Number(players) >= game.minPlayers && Number(players) <= game.maxPlayers)

        const maxTime = game.maxPlayTime ?? game.minPlayTime ?? 0
        const matchesTime =
          timeFilter === "any"
            ? true
            : timeFilter === "quick"
              ? maxTime > 0 && maxTime < 30
              : timeFilter === "standard"
                ? maxTime >= 30 && maxTime <= 90
                : maxTime >= 90

        const weight = game.averageWeight ?? 0
        const matchesWeight =
          weightFilter === "any"
            ? true
            : weightFilter === "light"
              ? weight >= 1 && weight <= 2
              : weightFilter === "medium"
                ? weight > 2 && weight <= 3.5
                : weight > 3.5

        const matchesCategory = selectedCategory === "all" || (game.categories ?? []).includes(selectedCategory)
        const matchesMechanic = selectedMechanic === "all" || (game.mechanics ?? []).includes(selectedMechanic)

        return matchesPlayers && matchesTime && matchesWeight && matchesCategory && matchesMechanic
      })
      .sort((left, right) => (right.averageRating ?? right.bggAverageRating ?? 0) - (left.averageRating ?? left.bggAverageRating ?? 0))
  }, [dataset?.games, players, selectedCategory, selectedMechanic, timeFilter, weightFilter])

  const wheelGames = filteredGames.slice(0, Math.min(filteredGames.length, 8))
  const currentPair = roundGames.slice(pairIndex, pairIndex + 2)

  useEffect(() => {
    const bracketSeed = shuffle(filteredGames.slice(0, Math.min(filteredGames.length, 8)))
    setRoundGames(bracketSeed)
    setRoundWinners([])
    setPairIndex(0)
    setRoundNumber(1)
    setChampion(null)
  }, [filteredGames])

  if (!hydrated) {
    return <div className="p-10 text-sm text-muted-foreground">Preparing game night picker...</div>
  }

  if (!dataset) {
    return <EmptyState title="No collection loaded" description="Load your collection from the setup page to start picking tonight’s game." />
  }

  function spinWheel() {
    if (!wheelGames.length) {
      return
    }

    const winnerIndex = Math.floor(Math.random() * wheelGames.length)
    const sliceAngle = 360 / wheelGames.length
    const targetAngle = 360 * 6 + (360 - winnerIndex * sliceAngle - sliceAngle / 2)

    setRotation(targetAngle)
    setSelectedSpinGame(wheelGames[winnerIndex])
    setSelectedGame(wheelGames[winnerIndex])
  }

  function chooseWinner(winner: GameRecord) {
    setSelectedGame(winner)
    const nextWinners = [...roundWinners, winner]
    const remainingGames = roundGames.slice(pairIndex + 2)

    if (!remainingGames.length) {
      if (nextWinners.length === 1) {
        setChampion(nextWinners[0])
        setSelectedGame(nextWinners[0])
        return
      }

      const nextRoundGames = nextWinners.length % 2 === 1 ? [...nextWinners.slice(0, -1), nextWinners[nextWinners.length - 1]] : nextWinners
      setRoundGames(nextRoundGames)
      setRoundWinners([])
      setPairIndex(0)
      setRoundNumber((current) => current + 1)
      return
    }

    if (remainingGames.length === 1) {
      const nextRoundGames = [...nextWinners, remainingGames[0]]

      if (nextRoundGames.length === 1) {
        setChampion(nextRoundGames[0])
        setSelectedGame(nextRoundGames[0])
        return
      }

      setRoundGames(nextRoundGames)
      setRoundWinners([])
      setPairIndex(0)
      setRoundNumber((current) => current + 1)
      return
    }

    setRoundWinners(nextWinners)
    setPairIndex((current) => current + 2)
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Game Night Picker</h1>
            <p className="text-sm text-muted-foreground">Filter your own shelf, spin the wheel, or settle it head-to-head.</p>
          </div>
          <Button variant="outline">
            <Link href="/collection">Back to collection</Link>
          </Button>
        </div>

        <Card className="border-white/10 bg-card/75">
          <CardContent className="space-y-5 p-5">
            <div>
              <div className="mb-3 text-sm font-semibold">Player count</div>
              <div className="flex flex-wrap gap-2">
                <FilterPill active={players === "any"} onClick={() => setPlayers("any")}>Any</FilterPill>
                {playerOptions.map((option) => (
                  <FilterPill key={option} active={players === option} onClick={() => setPlayers(option)}>
                    {option === "8" ? "8+" : option}
                  </FilterPill>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-3 text-sm font-semibold">Time available</div>
                <div className="flex flex-wrap gap-2">
                  {timeOptions.map((option) => (
                    <FilterPill key={option.key} active={timeFilter === option.key} onClick={() => setTimeFilter(option.key)}>
                      {option.label}
                    </FilterPill>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-3 text-sm font-semibold">Weight</div>
                <div className="flex flex-wrap gap-2">
                  {weightOptions.map((option) => (
                    <FilterPill key={option.key} active={weightFilter === option.key} onClick={() => setWeightFilter(option.key)}>
                      {option.label}
                    </FilterPill>
                  ))}
                </div>
              </div>
            </div>

            <button type="button" className="flex items-center gap-2 text-sm text-primary" onClick={() => setExpandedFilters((current) => !current)}>
              <ChevronDown className={cn("size-4 transition", expandedFilters && "rotate-180")} />
              Category and mechanic pills
            </button>

            {expandedFilters ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Categories</div>
                  <div className="flex flex-wrap gap-2">
                    <FilterPill active={selectedCategory === "all"} onClick={() => setSelectedCategory("all")}>Any</FilterPill>
                    {categories.map((item) => (
                      <FilterPill key={item} active={selectedCategory === item} onClick={() => setSelectedCategory(item)}>{item}</FilterPill>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Mechanics</div>
                  <div className="flex flex-wrap gap-2">
                    <FilterPill active={selectedMechanic === "all"} onClick={() => setSelectedMechanic("all")}>Any</FilterPill>
                    {mechanics.map((item) => (
                      <FilterPill key={item} active={selectedMechanic === item} onClick={() => setSelectedMechanic(item)}>{item}</FilterPill>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {selectedGame ? (
          <Card className="border-primary/20 bg-primary/10">
            <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-primary">Selected game</div>
                <div className="mt-1 text-2xl font-semibold">{selectedGame.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">{selectedGame.minPlayers ?? "?"}-{selectedGame.maxPlayers ?? "?"} players · {formatPlayTime(selectedGame)}</div>
              </div>
              {isLoggedIn ? (
                <Button onClick={() => setLogDialogOpen(true)}>
                  Log this play on BGG
                </Button>
              ) : (
                <Badge className="bg-white/10 text-muted-foreground">Connect BGG to log this pick</Badge>
              )}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-white/10 bg-card/75">
            <CardHeader>
              <CardTitle>Matching games</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">{filteredGames.length} games match right now, sorted by BGG rating.</div>
              {filteredGames.length ? (
                <div className="grid gap-3">
                  {filteredGames.map((game) => (
                    <CompactResultCard key={game.id} game={game} onSelect={() => setSelectedGame(game)} />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center text-sm text-muted-foreground">No games match these filters. Try widening player count, time, or weight.</div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-white/10 bg-card/75">
              <CardHeader>
                <CardTitle>Spin the wheel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <SpinnerWheel games={wheelGames} rotation={rotation} />
                <Button className="w-full" onClick={spinWheel} disabled={!wheelGames.length}>
                  <Dices className="size-4" />
                  Spin
                </Button>
                {selectedSpinGame ? (
                  <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                    <div className="text-xs uppercase tracking-wide text-primary">Wheel pick</div>
                    <div className="mt-1 text-lg font-semibold">{selectedSpinGame.name}</div>
                    <div className="text-sm text-muted-foreground">{selectedSpinGame.minPlayers}-{selectedSpinGame.maxPlayers} players · {selectedSpinGame.maxPlayTime ?? selectedSpinGame.minPlayTime ?? "?"} min</div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-card/75">
              <CardHeader>
                <CardTitle>Can’t decide?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {champion ? (
                  <div className="rounded-2xl border border-primary/20 bg-primary/10 p-5">
                    <div className="text-xs uppercase tracking-wide text-primary">Bracket winner</div>
                    <div className="mt-1 text-xl font-semibold">{champion.name}</div>
                    <div className="mt-2 text-sm text-muted-foreground">Round {roundNumber} settled it.</div>
                  </div>
                ) : currentPair.length >= 2 ? (
                  <>
                    <div className="text-sm text-muted-foreground">Round {roundNumber} · choose your winner from this head-to-head matchup.</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {currentPair.map((game) => (
                        <button key={game.id} type="button" onClick={() => chooseWinner(game)} className="rounded-3xl border border-white/10 bg-background/50 p-4 text-left transition hover:border-primary/40 hover:bg-background/70">
                          <div className="text-lg font-semibold">{game.name}</div>
                          <div className="mt-2 text-sm text-muted-foreground">{game.minPlayers}-{game.maxPlayers} players · {game.maxPlayTime ?? game.minPlayTime ?? "?"} min</div>
                          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                            <Swords className="size-4" />
                            BGG {round(game.averageRating ?? game.bggAverageRating ?? 0, 1)} · Weight {round(game.averageWeight ?? 0, 1)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">Need at least two matching games to run a head-to-head bracket.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <BggLogPlayDialog game={selectedGame} open={logDialogOpen} onOpenChange={setLogDialogOpen} />
    </>
  )
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("rounded-full border px-4 py-2 text-sm transition", active ? "border-primary/30 bg-primary/20 text-primary" : "border-white/10 bg-background/60 text-muted-foreground hover:border-primary/20 hover:text-foreground")}>
      {children}
    </button>
  )
}

function CompactResultCard({ game, onSelect }: { game: GameRecord; onSelect: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-background/45 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 overflow-hidden rounded-2xl bg-black/30">
          {game.image || game.thumbnail ? <img src={game.image ?? game.thumbnail} alt={game.name} className="h-full w-full object-cover" /> : null}
        </div>
        <div>
          <div className="font-semibold">{game.name}</div>
          <div className="text-sm text-muted-foreground">{game.minPlayers}-{game.maxPlayers} players · {formatPlayTime(game)}</div>
          <div className="mt-1 flex flex-wrap gap-2">
            <Badge className="bg-white/8">BGG {round(game.averageRating ?? game.bggAverageRating ?? 0, 1)}</Badge>
            <Badge className="bg-white/8">{renderWeightDots(game.averageWeight ?? 0)}</Badge>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onSelect}>
          <WandSparkles className="size-4" />
          Choose game
        </Button>
        <Button variant="outline">
          <Link href={game.bggUrl} target="_blank" rel="noreferrer">View on BGG</Link>
        </Button>
      </div>
    </div>
  )
}

function SpinnerWheel({ games, rotation }: { games: GameRecord[]; rotation: number }) {
  if (!games.length) {
    return <div className="flex aspect-square items-center justify-center rounded-full border border-dashed border-white/10 text-sm text-muted-foreground">Need matching games to spin.</div>
  }

  const slice = 360 / games.length
  const gradient = games.map((_, index) => `${wheelColors[index % wheelColors.length]} ${index * slice}deg ${(index + 1) * slice}deg`).join(", ")

  return (
    <div className="relative mx-auto aspect-square max-w-[320px]">
      <div className="absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 border-x-[14px] border-b-[22px] border-x-transparent border-b-primary" />
      <div className="absolute inset-0 rounded-full border border-white/10 bg-background/40 p-2">
        <div className="relative h-full w-full rounded-full" style={{ transform: `rotate(${rotation}deg)`, transition: "transform 3s cubic-bezier(0.15, 0.85, 0.2, 1)" }}>
          <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(${gradient})` }} />
          {games.map((game, index) => (
            <div key={game.id} className="absolute left-1/2 top-1/2 origin-center text-[10px] font-medium text-white" style={{ transform: `rotate(${index * slice + slice / 2}deg) translateY(-132px) rotate(${90}deg)` }}>
              {game.name.slice(0, 16)}
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-[34%] flex items-center justify-center rounded-full border border-white/10 bg-background/95 text-center text-xs font-semibold text-foreground shadow-lg">
        Spin
      </div>
    </div>
  )
}

function formatPlayTime(game: GameRecord) {
  if (!game.minPlayTime && !game.maxPlayTime) {
    return "? min"
  }

  if (game.minPlayTime && game.maxPlayTime && game.minPlayTime !== game.maxPlayTime) {
    return `${game.minPlayTime}-${game.maxPlayTime} min`
  }

  return `${game.maxPlayTime ?? game.minPlayTime} min`
}

function renderWeightDots(weight: number) {
  const filled = Math.max(1, Math.min(5, Math.round(weight)))
  return "●".repeat(filled) + "○".repeat(5 - filled)
}

function shuffle<T>(items: T[]) {
  const next = [...items]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }

  return next
}

export default function PlayPage() {
  return (
    <ClientOnly fallback={null}>
      <PlayPageInner />
    </ClientOnly>
  )
}
