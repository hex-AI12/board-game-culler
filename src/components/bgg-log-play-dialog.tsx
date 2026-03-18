"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarPlus2, LoaderCircle } from "lucide-react"
import { toast } from "sonner"

import { useBggActions } from "@/hooks/use-bgg-actions"
import type { GameRecord } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

export function BggLogPlayDialog({
  game,
  open,
  onOpenChange,
}: {
  game: GameRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { handleBggError, logPlay } = useBggActions()
  const [playdate, setPlaydate] = useState(todayString())
  const [location, setLocation] = useState("")
  const [comments, setComments] = useState("")
  const [saving, setSaving] = useState(false)

  const title = useMemo(() => (game ? `Log this play for ${game.name}` : "Log this play on BGG"), [game])

  useEffect(() => {
    if (!open) {
      return
    }

    setPlaydate(todayString())
    setLocation("")
    setComments("")
  }, [open])

  async function handleSave() {
    if (!game) {
      return
    }

    setSaving(true)

    try {
      await logPlay({
        objectid: game.id,
        playdate,
        location: location || undefined,
        comments: comments || undefined,
      })
      toast.success(`Logged ${game.name} on BGG.`)
      onOpenChange(false)
    } catch (error) {
      handleBggError(error, "Unable to log this play on BGG.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log this play on BGG</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</label>
            <Input type="date" value={playdate} onChange={(event) => setPlaydate(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Location</label>
            <Input placeholder="Optional" value={location} onChange={(event) => setLocation(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Comments</label>
            <Input placeholder="Optional" value={comments} onChange={(event) => setComments(event.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={!game || !playdate || saving}>
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : <CalendarPlus2 className="size-4" />}
            {saving ? "Logging..." : "Log play"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
