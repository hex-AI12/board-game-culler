import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { AppHeader } from "@/components/app-header"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { BggSessionProvider } from "@/hooks/use-bgg-session"
import { CollectionProvider } from "@/hooks/use-collection"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "Board Game Shelf",
    template: "%s · Board Game Shelf",
  },
  description: "Your collection, sorted. Sync BGG data, pick what to play, analyze your shelf, manage wishlist overlap, and prep trades.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ThemeProvider>
          <BggSessionProvider>
            <CollectionProvider>
              <AppHeader />
              <main className="flex-1">{children}</main>
              <Toaster />
            </CollectionProvider>
          </BggSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
