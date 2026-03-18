"use client"

import { useCallback } from "react"
import { toast } from "sonner"

import { useBggSession } from "@/hooks/use-bgg-session"
import { BggSessionExpiredError, isBggSessionExpiredError, postBggProxy, requestBggLogin } from "@/lib/bgg-write-client"

interface CollectionStatusPayload {
  objectid: number
  objecttype?: "thing"
  own?: boolean
  fortrade?: boolean
  wanttoplay?: boolean
  wanttobuy?: boolean
  wishlist?: boolean
  wishlistpriority?: number
  prevowned?: boolean
}

interface LogPlayPayload {
  objectid: number
  playdate: string
  comments?: string
  length?: number
  location?: string
  quantity?: number
  players?: Array<{
    name: string
    username?: string
    score?: string
    win?: boolean
  }>
}

export function useBggActions() {
  const { clearSession, cookies } = useBggSession()

  const requireCookies = useCallback(() => {
    if (!cookies) {
      requestBggLogin()
      throw new BggSessionExpiredError("Connect your BGG account to use write-back features.")
    }

    return cookies
  }, [cookies])

  const handleBggError = useCallback(
    (error: unknown, fallbackMessage: string) => {
      if (isBggSessionExpiredError(error)) {
        clearSession()
        toast.error(error.message)
        requestBggLogin()
        return
      }

      toast.error(error instanceof Error ? error.message : fallbackMessage)
    },
    [clearSession]
  )

  const updateCollectionStatus = useCallback(
    async (payload: CollectionStatusPayload) => {
      return postBggProxy("/api/bgg/collection-status", payload, requireCookies())
    },
    [requireCookies]
  )

  const rateGame = useCallback(
    async (objectid: number, rating: number) => {
      return postBggProxy("/api/bgg/rate", { objectid, rating }, requireCookies())
    },
    [requireCookies]
  )

  const logPlay = useCallback(
    async (payload: LogPlayPayload) => {
      return postBggProxy("/api/bgg/log-play", payload, requireCookies())
    },
    [requireCookies]
  )

  return {
    cookies,
    handleBggError,
    logPlay,
    rateGame,
    updateCollectionStatus,
  }
}
