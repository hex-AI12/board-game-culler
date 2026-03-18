import { LoaderCircle } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import type { LoadingStage } from "@/lib/types"

const stages = [
  "Fetching collection",
  "Fetching details",
  "Fetching play history",
  "Calculating cull scores",
]

export function LoadingState({ stage }: { stage: LoadingStage | null }) {
  return (
    <Card className="border-white/10 bg-card/70 shadow-2xl shadow-black/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <LoaderCircle className="size-5 animate-spin text-primary" />
          Loading your shelf
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Progress value={stage?.progress ?? 10} />
        <div className="text-sm text-muted-foreground">{stage?.label ?? "Talking to BoardGameGeek..."}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          {stages.map((item, index) => (
            <div key={item} className="space-y-2 rounded-2xl border border-white/8 bg-background/60 p-4">
              <div className="flex items-center justify-between text-sm">
                <span>{item}</span>
                <span className="text-xs text-muted-foreground">Step {index + 1}</span>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
