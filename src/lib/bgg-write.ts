import { NextResponse } from "next/server"

const BGG_COOKIE_HEADER = "x-bgg-cookies"
const BGG_COOKIE_NAMES = new Set(["sessionid", "bggpassword", "bggusername", "bgg_password", "bgg_username"])

function getSetCookieHeaders(response: Response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie()
  }

  const header = response.headers.get("set-cookie")

  if (!header) {
    return []
  }

  return header.split(/,(?=[^;]+?=)/g)
}

function parseCookieHeader(setCookie: string) {
  const [cookiePair, ...attributes] = setCookie.split(";")
  const separatorIndex = cookiePair.indexOf("=")

  if (separatorIndex === -1) {
    return null
  }

  const name = cookiePair.slice(0, separatorIndex).trim()
  const value = cookiePair.slice(separatorIndex + 1).trim()
  const attributeMap = new Map<string, string>()

  for (const attribute of attributes) {
    const [rawKey, ...rawValue] = attribute.split("=")
    const key = rawKey.trim().toLowerCase()
    attributeMap.set(key, rawValue.join("=").trim())
  }

  return { name, value, attributes: attributeMap }
}

function hasExpired(attributes: Map<string, string>) {
  const maxAge = attributes.get("max-age")

  if (maxAge && Number(maxAge) <= 0) {
    return true
  }

  const expires = attributes.get("expires")

  if (!expires) {
    return false
  }

  const expiresAt = new Date(expires)
  return Number.isFinite(expiresAt.valueOf()) && expiresAt.getTime() <= Date.now()
}

export function getBggCookies(request: Request) {
  const cookies = request.headers.get(BGG_COOKIE_HEADER)?.trim()
  return cookies ? cookies : null
}

export function requireBggCookies(request: Request) {
  const cookies = getBggCookies(request)

  if (!cookies) {
    return {
      cookies: null,
      response: NextResponse.json({ error: "Missing BGG session. Please connect your BGG account again." }, { status: 401 }),
    }
  }

  return { cookies, response: null }
}

export function extractBggSessionCookies(response: Response) {
  const parsedCookies = getSetCookieHeaders(response)
    .map(parseCookieHeader)
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => item.value && !/^deleted$/i.test(item.value) && !hasExpired(item.attributes))

  const preferredCookies = parsedCookies.filter((item) => BGG_COOKIE_NAMES.has(item.name.toLowerCase()))
  const selectedCookies = preferredCookies.length ? preferredCookies : parsedCookies

  return selectedCookies.map((item) => `${item.name}=${item.value}`).join("; ")
}

export async function proxyBggPost(
  url: string,
  cookies: string,
  payload: Record<string, unknown>,
  options: {
    formFallback?: boolean
  } = {}
) {
  const headers = {
    Accept: "application/json, text/plain, */*",
    Cookie: cookies,
    Origin: "https://boardgamegeek.com",
    Referer: "https://boardgamegeek.com/",
    "X-Requested-With": "XMLHttpRequest",
  }

  const jsonResponse = await fetch(url, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  if (jsonResponse.ok || !options.formFallback || jsonResponse.status === 401 || jsonResponse.status === 403) {
    return jsonResponse
  }

  const formBody = new URLSearchParams()

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) {
      continue
    }

    if (typeof value === "boolean") {
      formBody.set(key, value ? "1" : "0")
      continue
    }

    if (typeof value === "string" || typeof value === "number") {
      formBody.set(key, String(value))
      continue
    }

    formBody.set(key, JSON.stringify(value))
  }

  return fetch(url, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body: formBody.toString(),
    cache: "no-store",
  })
}

export async function toProxyResponse(response: Response, fallbackError: string) {
  const text = await response.text()
  const contentType = response.headers.get("content-type") ?? ""
  const isJson = contentType.includes("application/json")

  let data: unknown = null
  if (text) {
    if (isJson) {
      try {
        data = JSON.parse(text)
      } catch {
        data = { raw: text }
      }
    } else {
      data = { raw: text }
    }
  }

  const unauthorized =
    response.status === 401 ||
    response.status === 403 ||
    /not\s+logged\s+in|sign\s*in|login required|unauthorized/i.test(text)

  if (!response.ok || unauthorized) {
    const status = unauthorized ? 401 : response.status
    const message =
      (typeof data === "object" && data && "message" in data && typeof data.message === "string" && data.message) ||
      (typeof data === "object" && data && "error" in data && typeof data.error === "string" && data.error) ||
      fallbackError

    return NextResponse.json({ error: message, data }, { status })
  }

  return NextResponse.json({ ok: true, data })
}
