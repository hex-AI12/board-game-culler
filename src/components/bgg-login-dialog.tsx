"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, LoaderCircle, LogIn, Unplug } from "lucide-react"
import { toast } from "sonner"

import { useCollection } from "@/hooks/use-collection"
import { useBggSession } from "@/hooks/use-bgg-session"
import { loadUsername } from "@/lib/storage"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export function BggLoginDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { dataset } = useCollection()
  const { clearSession, isLoggedIn, saveSession } = useBggSession()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setPassword("")
      return
    }

    setUsername((current) => current || dataset?.username || loadUsername())
  }, [dataset?.username, open])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!username.trim() || !password) {
      toast.error("Enter your BGG username and password.")
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch("/api/bgg/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as { cookies?: string; error?: string }

      if (!response.ok || !payload.cookies) {
        throw new Error(payload.error ?? "Unable to log in to BGG.")
      }

      saveSession(payload.cookies)
      setPassword("")
      toast.success("Connected to BoardGameGeek.")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to log in to BGG.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleDisconnect() {
    clearSession()
    setPassword("")
    toast.success("Disconnected from BoardGameGeek.")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log in to BGG</DialogTitle>
          <DialogDescription>
            Your password only goes through the server-side login proxy once. We keep the returned BGG cookies in this browser only.
          </DialogDescription>
        </DialogHeader>

        {isLoggedIn ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="size-4" />
              BGG connected
            </div>
            <div className="mt-1 text-emerald-100/80">You can now rate games, mark them for trade, and log plays.</div>
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Username</label>
            <Input autoComplete="username" placeholder="e.g. colewerq" value={username} onChange={(event) => setUsername(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Password</label>
            <Input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>

          <DialogFooter>
            {isLoggedIn ? (
              <Button type="button" variant="outline" onClick={handleDisconnect}>
                <Unplug className="size-4" />
                Disconnect
              </Button>
            ) : null}
            <Button type="submit" disabled={submitting}>
              {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              {submitting ? "Logging in..." : "Log in to BGG"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
