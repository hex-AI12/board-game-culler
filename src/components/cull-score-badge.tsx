import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function CullScoreBadge({ score, className }: { score: number; className?: string }) {
  const tone = score >= 75 ? "bg-red-500/15 text-red-200 border-red-500/30" : score >= 50 ? "bg-amber-500/15 text-amber-200 border-amber-500/30" : "bg-emerald-500/15 text-emerald-200 border-emerald-500/30"

  return (
    <Badge className={cn("border px-3 py-1 text-xs tracking-wide uppercase", tone, className)}>
      Cull Score {score}
    </Badge>
  )
}
