"use client"

import { useEffect, useState } from "react"
import { LoaderCircle, Star } from "lucide-react"
import { toast } from "sonner"

import { useBggActions } from "@/hooks/use-bgg-actions"
import type { GameRecord } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function BggRateDialog({
  game,
  open,
  onOpenChange,
  onRated,
}: {
  game: GameRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRated?: (rating: number) => void
}) {
  const { handleBggError, rateGame } = useBggActions()
  const [rating, setRating] = useState("7")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!game || !open) {
      return
    }

    const nextRating = game.userRating ? String(Math.max(1, Math.min(10, Math.round(game.userRating)))) : "7"
    setRating(nextRating)
  }, [game, open])

  async function handleSave() {
    if (!game) {
      return
    }

    setSaving(true)

    try {
      const nextRating = Number(rating)
      await rateGame(game.id, nextRating)
      onRated?.(nextRating)
      toast.success(`Saved a ${nextRating}/10 rating for ${game.name}.`)
      onOpenChange(false)
    } catch (error) {
      handleBggError(error, "Unable to save the BGG rating.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate on BGG</DialogTitle>
          <DialogDescription>{game ? `Save a quick BGG rating for ${game.name}.` : "Pick a game first."}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rating</label>
          <Select value={rating} onValueChange={(value) => setRating(value ?? "7") }>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, index) => String(index + 1)).map((value) => (
                <SelectItem key={value} value={value}>
                  {value}/10
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={!game || saving}>
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Star className="size-4" />}
            {saving ? "Saving..." : "Save rating"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
