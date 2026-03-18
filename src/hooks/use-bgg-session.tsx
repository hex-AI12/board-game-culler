"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import { clearBggSession, loadBggSession, saveBggSession } from "@/lib/bgg-session"

const BGG_SESSION_EVENT = "board-game-shelf::bgg-session-change"

interface BggSessionContextValue {
  cookies: string | null
  hydrated: boolean
  isLoggedIn: boolean
  saveSession: (cookies: string) => void
  clearSession: () => void
}

const BggSessionContext = createContext<BggSessionContextValue | null>(null)

function broadcastSessionChange() {
  if (typeof window === "undefined") {
    return
  }

  window.dispatchEvent(new Event(BGG_SESSION_EVENT))
}

export function BggSessionProvider({ children }: { children: React.ReactNode }) {
  const [cookies, setCookies] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setCookies(loadBggSession())
    setHydrated(true)
  }, [])

  useEffect(() => {
    function syncSession() {
      setCookies(loadBggSession())
    }

    window.addEventListener("storage", syncSession)
    window.addEventListener(BGG_SESSION_EVENT, syncSession)

    return () => {
      window.removeEventListener("storage", syncSession)
      window.removeEventListener(BGG_SESSION_EVENT, syncSession)
    }
  }, [])

  const saveSession = useCallback((nextCookies: string) => {
    saveBggSession(nextCookies)
    setCookies(nextCookies)
    broadcastSessionChange()
  }, [])

  const clearSessionValue = useCallback(() => {
    clearBggSession()
    setCookies(null)
    broadcastSessionChange()
  }, [])

  const value = useMemo(
    () => ({
      cookies,
      hydrated,
      isLoggedIn: Boolean(cookies),
      saveSession,
      clearSession: clearSessionValue,
    }),
    [clearSessionValue, cookies, hydrated, saveSession]
  )

  return <BggSessionContext.Provider value={value}>{children}</BggSessionContext.Provider>
}

export function useBggSession() {
  const context = useContext(BggSessionContext)

  if (!context) {
    throw new Error("useBggSession must be used within BggSessionProvider")
  }

  return context
}
