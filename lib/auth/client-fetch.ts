import { createClient } from "@/lib/supabase/client"
import type { Session } from "@supabase/supabase-js"

const SESSION_CACHE_MS = 3000
let supabaseClient: ReturnType<typeof createClient> | null = null
let cachedSession: Session | null = null
let cachedAt = 0
let inflight: Promise<Session | null> | null = null

async function getSessionCached() {
  const now = Date.now()
  if (cachedSession && now - cachedAt < SESSION_CACHE_MS) {
    return cachedSession
  }

  if (inflight) {
    return inflight
  }

  const supabase = supabaseClient ?? (supabaseClient = createClient())
  inflight = supabase.auth.getSession().then(({ data }) => {
    cachedSession = data.session ?? null
    cachedAt = Date.now()
    inflight = null
    return cachedSession
  })

  return inflight
}

export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}) {
  let session = await getSessionCached()

  if (!session?.access_token) {
    // Give the auth client a brief moment to hydrate after redirects/logins.
    await new Promise((resolve) => setTimeout(resolve, 150))
    session = await getSessionCached()
  }

  const headers = new Headers(init.headers)
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`)
  }

  return fetch(input, { ...init, headers })
}
