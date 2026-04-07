import { NextResponse } from "next/server"
export const revalidate = 30

import { getRequestIdentityFromRequestWithOptions } from "@/lib/auth/request-identity"
import { resolveDashboardWorkspaceId } from "@/lib/server/dashboard-data"
import { createPrivateApiCacheHeaders } from "@/lib/server/cache-headers"
import { createAdminClient } from "@/lib/supabase/admin"

type DashboardCountsCacheEntry = {
  expiresAt: number
  payload: Record<string, unknown>
}

const DASHBOARD_COUNTS_CACHE_TTL_MS = 8_000
const dashboardCountsCache = new Map<string, DashboardCountsCacheEntry>()
const cacheHeaders = createPrivateApiCacheHeaders(8, 24)

export async function GET(request: Request) {
  const identity = await getRequestIdentityFromRequestWithOptions(request, {
    resolveWorkspaceAccess: true,
  })
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const workspaceId = resolveDashboardWorkspaceId(request, identity)
  const cacheKey = `dashboard-counts:${identity.userId}:${identity.role ?? ""}:${identity.email ?? ""}:${workspaceId}`
  const cached = dashboardCountsCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload, { headers: cacheHeaders })
  }
  if (cached) {
    dashboardCountsCache.delete(cacheKey)
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({
      stats: { total: 0, completed: 0, waiting: 0, overdue: 0, ongoing: 0 },
      charts: { completed: 0, total: 0 },
    }, { headers: cacheHeaders })
  }

  const { data } = await admin
    .from("dashboard_stats")
    .select("total_projects,completed_projects,overdue_projects,waiting_projects,ongoing_projects")
    .eq("workspace_id", workspaceId)
    .maybeSingle()

  let counts = data

  if (!counts) {
    const { data: projectRows } = await admin
      .from("projects")
      .select("status")
      .eq("created_by", workspaceId)

    const rows = projectRows || []
    counts = {
      total_projects: rows.length,
      completed_projects: rows.filter((project) => project.status === "completed").length,
      overdue_projects: rows.filter((project) => project.status === "overdue").length,
      waiting_projects: rows.filter((project) => project.status === "waiting").length,
      ongoing_projects: rows.filter((project) => project.status === "ongoing").length,
    }
  }

  const payload = {
    stats: {
      total: counts?.total_projects ?? 0,
      completed: counts?.completed_projects ?? 0,
      waiting: counts?.waiting_projects ?? 0,
      overdue: counts?.overdue_projects ?? 0,
      ongoing: counts?.ongoing_projects ?? 0,
    },
    charts: {
      completed: counts?.completed_projects ?? 0,
      total: counts?.total_projects ?? 0,
    },
  }

  dashboardCountsCache.set(cacheKey, {
    payload,
    expiresAt: Date.now() + DASHBOARD_COUNTS_CACHE_TTL_MS,
  })

  return NextResponse.json(payload, { headers: cacheHeaders })
}
