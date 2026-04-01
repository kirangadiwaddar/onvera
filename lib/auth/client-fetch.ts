import { createClient } from "@/lib/supabase/client"
import type { Session } from "@supabase/supabase-js"

const SESSION_CACHE_MS = 3000
const DEFAULT_GET_CACHE_MS = 1500
const ENDPOINT_CACHE_RULES: Array<{ pattern: RegExp; ttlMs: number }> = [
  { pattern: /\/api\/workspaces(?:\?|$)/, ttlMs: 20_000 },
  { pattern: /\/api\/auth\/me(?:\?|$)/, ttlMs: 15_000 },
  { pattern: /\/api\/dashboard(?:\?|$)/, ttlMs: 8_000 },
  { pattern: /\/api\/projects\?summary=1(?:&|$)/, ttlMs: 8_000 },
  { pattern: /\/api\/teams(?:\?|$)/, ttlMs: 8_000 },
  { pattern: /\/api\/templates(?:\?|$)/, ttlMs: 8_000 },
]

let supabaseClient: ReturnType<typeof createClient> | null = null
let cachedSession: Session | null = null
let cachedAt = 0
let inflight: Promise<Session | null> | null = null
const inflightGetRequests = new Map<string, Promise<Response>>()
const responseCache = new Map<string, { expiresAt: number; response: Response }>()

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

function resolveMethod(init?: RequestInit) {
  const method = (init?.method || "GET").toUpperCase()
  return method
}

function resolveUrlString(input: RequestInfo | URL) {
  if (typeof input === "string") return input
  if (input instanceof URL) return input.toString()
  if (typeof Request !== "undefined" && input instanceof Request) return input.url
  return String(input)
}

function getCacheTtlMs(url: string) {
  const matched = ENDPOINT_CACHE_RULES.find((rule) => rule.pattern.test(url))
  return matched?.ttlMs ?? DEFAULT_GET_CACHE_MS
}

function buildGetCacheKey(url: string, workspaceId: string | null, userId: string | null) {
  return `${url}::${workspaceId || "no-workspace"}::${userId || "anon"}`
}

function clearResponseCache() {
  responseCache.clear()
  inflightGetRequests.clear()
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
  let workspaceId: string | null = null
  if (typeof window !== "undefined") {
    workspaceId = window.localStorage.getItem("onvera:workspace")
    if (workspaceId && workspaceId !== "__create__") {
      headers.set("x-workspace-id", workspaceId)
    }
  }

  const method = resolveMethod(init)
  const url = resolveUrlString(input)
  const userId = session?.user?.id ?? null
  const isGet = method === "GET"
  const cacheKey = isGet ? buildGetCacheKey(url, workspaceId, userId) : ""

  if (isGet) {
    const cached = responseCache.get(cacheKey)
    if (cached && Date.now() < cached.expiresAt) {
      return cached.response.clone()
    }
    if (cached && Date.now() >= cached.expiresAt) {
      responseCache.delete(cacheKey)
    }

    const pending = inflightGetRequests.get(cacheKey)
    if (pending) {
      return pending.then((response) => response.clone())
    }
  }

  const runFetch = async () => {
    try {
      return await fetch(input, { ...init, method, headers })
    } catch {
      return new Response(null, { status: 0, statusText: "Network error" })
    }
  }

  if (isGet) {
    const pending = runFetch()
    inflightGetRequests.set(cacheKey, pending)
    const response = await pending
    inflightGetRequests.delete(cacheKey)

    if (response.status !== 0) {
      const ttlMs = getCacheTtlMs(url)
      if (ttlMs > 0) {
        responseCache.set(cacheKey, {
          expiresAt: Date.now() + ttlMs,
          response: response.clone(),
        })
      }
    }
    return response
  }

  try {
    const response = await runFetch()
    if (response.ok) {
      clearResponseCache()
    }
    return response
  } catch {
    return new Response(null, { status: 0, statusText: "Network error" })
  }
}
