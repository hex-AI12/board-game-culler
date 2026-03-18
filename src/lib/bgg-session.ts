const BGG_SESSION_KEY = "board-game-shelf::bgg-session"

export function saveBggSession(cookies: string) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(BGG_SESSION_KEY, cookies)
}

export function loadBggSession(): string | null {
  if (typeof window === "undefined") {
    return null
  }

  return window.localStorage.getItem(BGG_SESSION_KEY)
}

export function clearBggSession() {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(BGG_SESSION_KEY)
}

export function isBggLoggedIn(): boolean {
  return Boolean(loadBggSession())
}
