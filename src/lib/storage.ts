import type { AppState, SharedResultsPayload, WishlistDataset } from "@/lib/types"

const STORAGE_KEY = "board-game-shelf::state"
const USERNAME_KEY = "board-game-shelf::username"
const WISHLIST_KEY_PREFIX = "board-game-shelf::wishlist::"

const LEGACY_STORAGE_KEY = "board-game-culler::state"
const LEGACY_USERNAME_KEY = "board-game-culler::username"

const emptyState: AppState = {
  dataset: null,
  decisions: {},
}

export function loadAppState(): AppState {
  if (typeof window === "undefined") {
    return emptyState
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY)
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

  return window.localStorage.getItem(USERNAME_KEY) ?? window.localStorage.getItem(LEGACY_USERNAME_KEY) ?? ""
}

export function clearAppState() {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(STORAGE_KEY)
  window.localStorage.removeItem(LEGACY_STORAGE_KEY)
}

export function saveWishlistCache(dataset: WishlistDataset) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(`${WISHLIST_KEY_PREFIX}${dataset.username.toLowerCase()}`, JSON.stringify(dataset))
}

export function loadWishlistCache(username: string) {
  if (typeof window === "undefined") {
    return null
  }

  const raw = window.localStorage.getItem(`${WISHLIST_KEY_PREFIX}${username.toLowerCase()}`)

  try {
    return raw ? (JSON.parse(raw) as WishlistDataset) : null
  } catch {
    return null
  }
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
