"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, HeartHandshake, LibraryBig, ListCollapse, Menu, Swords, Trophy, WandSparkles } from "lucide-react"
import { toast } from "sonner"

import { BggLoginDialog } from "@/components/bgg-login-dialog"
import { ClientOnly } from "@/components/client-only"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useCollection } from "@/hooks/use-collection"
import { useBggSession } from "@/hooks/use-bgg-session"
import { OPEN_BGG_LOGIN_EVENT } from "@/lib/bgg-write-client"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/collection", label: "Collection", icon: LibraryBig },
  { href: "/play", label: "Play", icon: WandSparkles },
  { href: "/culler", label: "Culler", icon: ListCollapse },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/wishlist", label: "Wishlist", icon: Trophy },
  { href: "/trades", label: "Trades", icon: HeartHandshake },
]

function BggConnectionControls() {
  const { clearSession, hydrated, isLoggedIn } = useBggSession()
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    function handleOpenLogin() {
      setDialogOpen(true)
    }

    window.addEventListener(OPEN_BGG_LOGIN_EVENT, handleOpenLogin)
    return () => window.removeEventListener(OPEN_BGG_LOGIN_EVENT, handleOpenLogin)
  }, [])

  if (!hydrated) {
    return null
  }

  return (
    <>
      {isLoggedIn ? (
        <>
          <Badge className="hidden bg-emerald-500/15 text-emerald-200 md:inline-flex">
            <span className="mr-2 size-2 rounded-full bg-emerald-400" />
            BGG Connected
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearSession()
              toast.success("Disconnected from BoardGameGeek.")
            }}
          >
            Disconnect
          </Button>
        </>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          Connect BGG
        </Button>
      )}

      <BggLoginDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}

export function AppHeader() {
  const pathname = usePathname()
  const { dataset, reviewedCount } = useCollection()

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-lg shadow-primary/15">
            <LibraryBig className="size-5" />
          </div>
          <div>
            <Link href="/" className="text-sm font-semibold tracking-wide text-foreground sm:text-base">
              Board Game Shelf
            </Link>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Your collection, sorted.</span>
              {dataset ? <Badge className="bg-white/8 text-[10px]">{dataset.username}</Badge> : null}
            </div>
          </div>
        </div>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon

            return (
              <Link key={item.href} href={item.href} className={buttonVariants({ variant: active ? "secondary" : "ghost", size: "sm" })}>
                <Icon className="size-4" />
                {item.label}
                {item.href === "/culler" && dataset ? <Badge className="ml-1 bg-primary/15 text-primary">{reviewedCount}</Badge> : null}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          {dataset ? (
            <Badge className="hidden bg-primary/15 text-primary md:inline-flex">
              <Swords className="mr-1 size-3" />
              {reviewedCount}/{dataset.games.length} reviewed
            </Badge>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="icon-sm" aria-label="Open navigation menu"><Menu className="size-4" /></Button>} />
            <DropdownMenuContent align="end" className="w-56 lg:hidden">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                const Icon = item.icon

                return (
                  <DropdownMenuItem key={item.href} className={cn(active && "bg-accent")}>
                    <Link href={item.href} className="flex w-full items-center justify-between gap-3">
                      <span className="flex items-center gap-2">
                        <Icon className="size-4" />
                        {item.label}
                      </span>
                      {item.href === "/culler" && dataset ? <Badge className="bg-primary/15 text-primary">{reviewedCount}</Badge> : null}
                    </Link>
                  </DropdownMenuItem>
                )
              })}
              <DropdownMenuItem>
                <Link href="/results" className="flex w-full items-center gap-2">
                  <Swords className="size-4" />
                  Results
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link href="/results">Results</Link>
          </Button>
          <ClientOnly fallback={null}>
            <BggConnectionControls />
          </ClientOnly>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
