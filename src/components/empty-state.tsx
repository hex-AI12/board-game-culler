"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"

export function EmptyState({
  title,
  description = "Load your collection from the setup page to get started.",
  href = "/",
  cta = "Go to setup",
}: {
  title: string
  description?: string
  href?: string
  cta?: string
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-3 text-muted-foreground">{description}</p>
      <Button className="mt-6">
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  )
}
