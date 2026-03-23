import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "404 · Board Game Shelf",
  robots: { index: false },
}

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-20 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          That page doesn&apos;t exist. Probably not in your collection either.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Back to shelf</Link>
      </Button>
    </div>
  )
}
