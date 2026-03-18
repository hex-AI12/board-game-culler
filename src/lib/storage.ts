import type { AppState, SharedResultsPayload } from "@/lib/types"

const STORAGE_KEY = "board-game-culler::state"
const USERNAME_KEY = "board-game-culler::username"

const emptyState: AppState = {
  dataset: null,
  decisions: {},
}

export function loadAppState(): AppState {
  if (typeof window === "undefined") {
    return emptyState
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AppState) : emptyState
  } catch {
    return emptyState
  }
}

export function saveAppState(state: AppState) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function saveUsername(username: string) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(USERNAME_KEY, username)
}

export function loadUsername() {
  if (typeof window === "undefined") {
    return ""
  }

  return window.localStorage.getItem(USERNAME_KEY) ?? ""
}

export function clearAppState() {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(STORAGE_KEY)
}

export function encodeSharePayload(payload: SharedResultsPayload) {
  if (typeof window === "undefined") {
    return ""
  }

  return window.btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
}

export function decodeSharePayload(value: string): SharedResultsPayload | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    return JSON.parse(decodeURIComponent(escape(window.atob(value)))) as SharedResultsPayload
  } catch {
    return null
  }
}
