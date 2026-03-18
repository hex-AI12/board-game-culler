"use client"

import Link from "next/link"
import { ExternalLink, Layers3, Star, Users } from "lucide-react"

import { CullScoreBadge } from "@/components/cull-score-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Decision, GameRecord, ViewMode } from "@/lib/types"
import { cn, formatDate, round } from "@/lib/utils"

const decisionTone: Record<Decision, string> = {
  keep: "bg-emerald-500/15 text-emerald-200 border-emerald-500/20",
  maybe: "bg-amber-500/15 text-amber-200 border-amber-500/20",
  cull: "bg-red-500/15 text-red-200 border-red-500/20",
}

export function GameCard({
  game,
  viewMode,
  decision,
}: {
  game: GameRecord
  viewMode: ViewMode
  decision?: Decision
}) {
  return (
    <Card
      className={cn(
        "group overflow-hidden border-white/10 bg-gradient-to-b from-card to-card/70 shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-primary/10",
        viewMode === "list" && "flex flex-col sm:flex-row"
      )}
    >
      <div className={cn("relative overflow-hidden bg-black/30", viewMode === "list" ? "sm:w-48" : "aspect-[4/3] w-full")}> 
        {game.image || game.thumbnail ? (
          <img
            src={game.image ?? game.thumbnail}
            alt={game.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full min-h-48 items-center justify-center bg-linear-to-br from-zinc-900 to-zinc-800 text-zinc-500">
            <Layers3 className="size-10" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-linear-to-t from-black/70 to-transparent p-3">
          <CullScoreBadge score={game.cullScore} />
          {decision ? <Badge className={cn("border", decisionTone[decision])}>{decision}</Badge> : null}
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{game.name}</h3>
            <p className="text-sm text-muted-foreground">{game.yearPublished ?? "Unknown year"}</p>
          </div>
          <Button variant="ghost" size="icon" render={<Link href={game.bggUrl} target="_blank" rel="noreferrer" aria-label={`Open ${game.name} on BGG`} />}>



          </Button>
        </div>

        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-3">
          <Metric icon={<Star className="size-4" />} label="Your rating" value={game.userRating ? `${round(game.userRating, 1)}/10` : "Unrated"} />
          <Metric icon={<Star className="size-4" />} label="BGG average" value={game.averageRating ? round(game.averageRating, 1) : "—"} />
          <Metric icon={<Users className="size-4" />} label="Players" value={game.minPlayers && game.maxPlayers ? `${game.minPlayers}-${game.maxPlayers}` : "—"} />
          <Metric icon={<Layers3 className="size-4" />} label="Play count" value={game.playCount} />
          <Metric icon={<Layers3 className="size-4" />} label="Last played" value={formatDate(game.lastPlayed)} />
          <Metric icon={<Layers3 className="size-4" />} label="Weight" value={game.averageWeight ? round(game.averageWeight, 1) : "—"} />
        </div>

        <div className="flex flex-wrap gap-2">
          {(game.mechanics ?? []).slice(0, 3).map((mechanic) => (
            <Badge key={mechanic} className="bg-white/6 text-muted-foreground">
              {mechanic}
            </Badge>
          ))}
          {game.scoreDelta ? (
            <Badge className={cn("border", game.scoreDelta > 0 ? "border-red-500/20 bg-red-500/10 text-red-200" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200") }>
              {game.scoreDelta > 0 ? "+" : ""}
              {game.scoreDelta} since last import
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-background/55 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  )
}
