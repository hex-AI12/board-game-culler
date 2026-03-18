"use client"

import { Check, SkipForward, TriangleAlert, X } from "lucide-react"

import { CullScoreBadge } from "@/components/cull-score-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { Decision, GameRecord } from "@/lib/types"
import { formatDate, round } from "@/lib/utils"

const actions: Array<{ decision: Decision; label: string; icon: React.ReactNode; className: string }> = [
  { decision: "keep", label: "Keep", icon: <Check className="size-4" />, className: "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30" },
  { decision: "maybe", label: "Maybe", icon: <TriangleAlert className="size-4" />, className: "bg-amber-500/20 text-amber-200 hover:bg-amber-500/30" },
  { decision: "cull", label: "Cull", icon: <X className="size-4" />, className: "bg-red-500/20 text-red-200 hover:bg-red-500/30" },
]

export function DecisionCard({
  game,
  reviewedCount,
  total,
  onDecide,
  onSkip,
}: {
  game: GameRecord
  reviewedCount: number
  total: number
  onDecide: (decision: Decision) => void
  onSkip: () => void
}) {
  return (
    <Card className="overflow-hidden border-white/10 bg-card/80 shadow-2xl shadow-black/30">
      <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative min-h-[320px] bg-black/30">
          {game.image || game.thumbnail ? <img src={game.image ?? game.thumbnail} alt={game.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>}
          <div className="absolute inset-0 bg-linear-to-t from-background via-background/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6">
            <div className="mb-3 flex items-center gap-2">
              <CullScoreBadge score={game.cullScore} />
              <Badge className="bg-white/10">{game.cullScoreLabel}</Badge>
            </div>
            <h2 className="text-3xl font-semibold text-foreground">{game.name}</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{game.description?.slice(0, 240) || "No description from BGG."}</p>
          </div>
        </div>

        <div className="flex flex-col">
          <CardHeader className="space-y-4 border-b border-white/10">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Decision mode</CardTitle>
              <Badge className="bg-primary/15 text-primary">{reviewedCount}/{total} done</Badge>
            </div>
            <Progress value={(reviewedCount / total) * 100} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Meta label="Players" value={game.minPlayers && game.maxPlayers ? `${game.minPlayers}-${game.maxPlayers}` : "—"} />
              <Meta label="Weight" value={game.averageWeight ? round(game.averageWeight, 1) : "—"} />
              <Meta label="Play count" value={game.playCount} />
              <Meta label="Last played" value={formatDate(game.lastPlayed)} />
            </div>
          </CardHeader>

          <CardContent className="flex-1 space-y-5 p-6">
            <div>
              <div className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Cull breakdown</div>
              <div className="space-y-3">
                {Object.entries(game.cullBreakdown)
                  .filter(([key]) => key !== "insights" && key !== "total")
                  .map(([key, value]) => (
                    <div key={key}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="capitalize text-foreground">{key.replace(/([A-Z])/g, " $1")}</span>
                        <span className="text-muted-foreground">{value}</span>
                      </div>
                      <Progress value={value as number} />
                    </div>
                  ))}
              </div>
            </div>

            <div>
              <div className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Why it scored this way</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {game.cullBreakdown.insights.map((item) => (
                  <li key={item} className="rounded-2xl border border-white/8 bg-background/60 px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>

          <CardFooter className="flex flex-wrap gap-3 border-t border-white/10 p-6">
            {actions.map((action) => (
              <Button key={action.decision} className={action.className} onClick={() => onDecide(action.decision)}>
                {action.icon}
                {action.label}
              </Button>
            ))}
            <Button variant="outline" onClick={onSkip}>
              <SkipForward className="size-4" />
              Skip
            </Button>
          </CardFooter>
        </div>
      </div>
    </Card>
  )
}

function Meta({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-background/60 p-3 text-sm">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium text-foreground">{value}</div>
    </div>
  )
}
