import { NextResponse } from "next/server"
import { getRequestIdentityFromRequestWithOptions } from "@/lib/auth/request-identity"
import { createAdminClient } from "@/lib/supabase/admin"

type DashboardShellCacheEntry = {
  expiresAt: number
  payload: Record<string, unknown>
}

const DASHBOARD_SHELL_CACHE_TTL_MS = 10_000
const dashboardShellCache = new Map<string, DashboardShellCacheEntry>()

export async function GET(request: Request) {
  const identity = await getRequestIdentityFromRequestWithOptions(request, {
    resolveWorkspaceAccess: false,
    includeProfileLookup: false,
  })

  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const workspaceId = request.headers.get("x-workspace-id")?.trim() || "-"
  const cacheKey = `dashboard-shell:${identity.userId}:${identity.role ?? ""}:${workspaceId}`
  const cached = dashboardShellCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload)
  }
  if (cached) {
    dashboardShellCache.delete(cacheKey)
  }

  const admin = createAdminClient()
  const { data: profile } = admin
    ? await admin
        .from("profiles")
        .select("id, full_name, role, plan")
        .eq("id", identity.userId)
        .maybeSingle()
    : { data: null }

  const payload = {
    user: {
      id: identity.userId,
      email: identity.email,
      fullName: profile?.full_name ?? null,
      role: profile?.role ?? identity.role,
      plan: profile?.plan ?? identity.plan,
    },
    workspace: {
      id: workspaceId !== "-" ? workspaceId : identity.userId,
    },
  }

  dashboardShellCache.set(cacheKey, {
    payload,
    expiresAt: Date.now() + DASHBOARD_SHELL_CACHE_TTL_MS,
  })

  return NextResponse.json(payload)
}

