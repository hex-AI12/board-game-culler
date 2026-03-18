export class BggSessionExpiredError extends Error {
  constructor(message = "Your BGG session expired. Please sign in again.") {
    super(message)
    this.name = "BggSessionExpiredError"
  }
}

export const OPEN_BGG_LOGIN_EVENT = "board-game-shelf::open-bgg-login"

export function requestBggLogin() {
  if (typeof window === "undefined") {
    return
  }

  window.dispatchEvent(new Event(OPEN_BGG_LOGIN_EVENT))
}

export function isBggSessionExpiredError(error: unknown): error is BggSessionExpiredError {
  return error instanceof BggSessionExpiredError
}

export async function postBggProxy<T>(path: string, body: unknown, cookies: string) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-BGG-Cookies": cookies,
    },
    body: JSON.stringify(body),
  })

  const payload = (await response.json().catch(() => ({}))) as T & { error?: string }

  if (response.status === 401) {
    throw new BggSessionExpiredError(payload.error)
  }

  if (!response.ok) {
    throw new Error(payload.error ?? "BGG write-back failed.")
  }

  return payload
}
