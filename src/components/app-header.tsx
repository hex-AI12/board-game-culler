"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Gamepad2, Sparkles } from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useCollection } from "@/hooks/use-collection"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Setup" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/decide", label: "Decide" },
  { href: "/results", label: "Results" },
]

export function AppHeader() {
  const pathname = usePathname()
  const { dataset, reviewedCount } = useCollection()

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-lg shadow-primary/15">
            <Gamepad2 className="size-5" />
          </div>
          <div>
            <Link href="/" className="text-sm font-semibold tracking-wide text-foreground sm:text-base">
              Board Game Culler
            </Link>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Dark shelf triage for collectors</span>
              {dataset ? <Badge className="bg-white/8 text-[10px]">{dataset.username}</Badge> : null}
            </div>
          </div>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={buttonVariants({ variant: pathname === item.href ? "secondary" : "ghost", size: "sm" })}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {dataset ? (
            <Badge className="hidden bg-primary/15 text-primary md:inline-flex">
              <Sparkles className="mr-1 size-3" />
              {reviewedCount}/{dataset.games.length} reviewed
            </Badge>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm">Navigate</Button>} />
            <DropdownMenuContent align="end">
              {navItems.map((item) => (
                <DropdownMenuItem key={item.href} className={cn(pathname === item.href && "bg-accent")}>
                  <Link href={item.href} className="block w-full">
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
