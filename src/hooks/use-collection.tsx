"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import { loadAppState, saveAppState } from "@/lib/storage"
import type { AppState, CollectionDataset, Decision, DecisionMap, GameRecord } from "@/lib/types"

interface CollectionContextValue {
  hydrated: boolean
  dataset: CollectionDataset | null
  decisions: DecisionMap
  importDataset: (dataset: CollectionDataset) => void
  updateGame: (gameId: number, patch: Partial<GameRecord>) => void
  setDecision: (gameId: number, decision: Decision) => void
  clearDecision: (gameId: number) => void
  resetDecisions: () => void
  reviewedCount: number
  decisionGroups: Record<Decision, GameRecord[]>
}

const CollectionContext = createContext<CollectionContextValue | null>(null)

export function CollectionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({ dataset: null, decisions: {} })
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setState(loadAppState())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) {
      saveAppState(state)
    }
  }, [hydrated, state])

  const importDataset = useCallback((dataset: CollectionDataset) => {
    setState((current) => {
      const allowedIds = new Set(dataset.games.map((game) => String(game.id)))
      const nextDecisions = Object.fromEntries(
        Object.entries(current.decisions).filter(([id]) => allowedIds.has(id))
      ) as DecisionMap

      return {
        dataset,
        decisions: current.dataset?.username === dataset.username ? nextDecisions : {},
      }
    })
  }, [])

  const updateGame = useCallback((gameId: number, patch: Partial<GameRecord>) => {
    setState((current) => {
      if (!current.dataset) {
        return current
      }

      return {
        ...current,
        dataset: {
          ...current.dataset,
          games: current.dataset.games.map((game) => (game.id === gameId ? { ...game, ...patch } : game)),
        },
      }
    })
  }, [])

  const setDecision = useCallback((gameId: number, decision: Decision) => {
    setState((current) => ({
      ...current,
      decisions: {
        ...current.decisions,
        [String(gameId)]: decision,
      },
    }))
  }, [])

  const clearDecision = useCallback((gameId: number) => {
    setState((current) => {
      const next = { ...current.decisions }
      delete next[String(gameId)]
      return { ...current, decisions: next }
    })
  }, [])

  const resetDecisions = useCallback(() => {
    setState((current) => ({
      ...current,
      decisions: {},
    }))
  }, [])

  const decisionGroups = useMemo(() => {
    const groups: Record<Decision, GameRecord[]> = {
      keep: [],
      maybe: [],
      cull: [],
    }

    for (const game of state.dataset?.games ?? []) {
      const decision = state.decisions[String(game.id)]
      if (decision) {
        groups[decision].push(game)
      }
    }

    return groups
  }, [state.dataset?.games, state.decisions])

  const reviewedCount = useMemo(() => Object.keys(state.decisions).length, [state.decisions])

  const value = useMemo(
    () => ({
      hydrated,
      dataset: state.dataset,
      decisions: state.decisions,
      importDataset,
      updateGame,
      setDecision,
      clearDecision,
      resetDecisions,
      reviewedCount,
      decisionGroups,
    }),
    [clearDecision, decisionGroups, hydrated, importDataset, reviewedCount, resetDecisions, setDecision, state.dataset, state.decisions, updateGame]
  )

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>
}

export function useCollection() {
  const context = useContext(CollectionContext)

  if (!context) {
    throw new Error("useCollection must be used within CollectionProvider")
  }

  return context
}
