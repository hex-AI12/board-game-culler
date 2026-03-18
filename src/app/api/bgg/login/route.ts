import { NextRequest, NextResponse } from "next/server"

import { extractBggSessionCookies } from "@/lib/bgg-write"

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { username?: string; password?: string } | null
  const username = body?.username?.trim()
  const password = body?.password ?? ""

  if (!username || !password) {
    return NextResponse.json({ error: "BGG username and password are required." }, { status: 400 })
  }

  const response = await fetch("https://boardgamegeek.com/login/api/v1", {
    method: "POST",
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      Origin: "https://boardgamegeek.com",
      Referer: "https://boardgamegeek.com/",
    },
    body: JSON.stringify({
      credentials: {
        username,
        password,
      },
    }),
    cache: "no-store",
  })

  const cookies = extractBggSessionCookies(response)
  const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null

  if (!response.ok || !cookies) {
    return NextResponse.json(
      { error: payload?.error ?? payload?.message ?? "BGG login failed. Check your credentials and try again." },
      { status: response.status === 401 ? 401 : 400 }
    )
  }

  return NextResponse.json({ cookies })
}
