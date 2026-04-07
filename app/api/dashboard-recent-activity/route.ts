import { NextResponse } from "next/server"
export const revalidate = 30

import { getRequestIdentityFromRequestWithOptions } from "@/lib/auth/request-identity"
import { createPrivateApiCacheHeaders } from "@/lib/server/cache-headers"
import { resolveDashboardWorkspaceId } from "@/lib/server/dashboard-data"
import { createAdminClient } from "@/lib/supabase/admin"

type DashboardRecentActivityCacheEntry = {
  expiresAt: number
  payload: Record<string, unknown>
}

type DashboardActivityItem = {
  id: string
  title: string
  project: string
  status: string
  actor: "Admin" | "Client"
  timestamp: string
}

function mergeRecentActivities(
  createdActivities: DashboardActivityItem[],
  updatedActivities: DashboardActivityItem[],
  limit: number,
) {
  const merged: DashboardActivityItem[] = []
  let createdIndex = 0
  let updatedIndex = 0

  while (merged.length < limit) {
    const nextCreated = createdActivities[createdIndex]
    const nextUpdated = updatedActivities[updatedIndex]

    if (!nextCreated && !nextUpdated) break
    if (!nextUpdated || (nextCreated && nextCreated.timestamp >= nextUpdated.timestamp)) {
      merged.push(nextCreated)
      createdIndex += 1
      continue
    }
    merged.push(nextUpdated)
    updatedIndex += 1
  }

  return merged
}

const DASHBOARD_RECENT_ACTIVITY_CACHE_TTL_MS = 15_000
const dashboardRecentActivityCache = new Map<string, DashboardRecentActivityCacheEntry>()
const cacheHeaders = createPrivateApiCacheHeaders(15, 45)

export async function GET(request: Request) {
  const identity = await getRequestIdentityFromRequestWithOptions(request, {
    resolveWorkspaceAccess: true,
  })
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limitRaw = Number(searchParams.get("limit") ?? "50")
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50
  const workspaceId = resolveDashboardWorkspaceId(request, identity)
  const cacheKey = `dashboard-recent-activity:${limit}:${identity.userId}:${identity.role ?? ""}:${identity.email ?? ""}:${workspaceId}`
  const cached = dashboardRecentActivityCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload, { headers: cacheHeaders })
  }
  if (cached) {
    dashboardRecentActivityCache.delete(cacheKey)
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ activities: [] }, { headers: cacheHeaders })
  }

  const [createdRowsResult, updatedRowsResult] = await Promise.all([
    admin
      .from("projects")
      .select("slug,title,created_at")
      .eq("created_by", workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit),
    admin
      .from("projects")
      .select("slug,title,last_client_update_at")
      .eq("created_by", workspaceId)
      .not("last_client_update_at", "is", null)
      .order("last_client_update_at", { ascending: false })
      .limit(limit),
  ])

  const createdActivities: DashboardActivityItem[] = (createdRowsResult.data || []).map((project) => ({
      id: `${project.slug}-created`,
      title: "Project created",
      project: project.title,
      status: "created",
      actor: "Admin" as const,
      timestamp: project.created_at,
    }))
  const updatedActivities: DashboardActivityItem[] = (updatedRowsResult.data || []).map((project) => ({
      id: `${project.slug}-client-update-${project.last_client_update_at}`,
      title: "Client updated checklist",
      project: project.title,
      status: "updated",
      actor: "Client" as const,
      timestamp: project.last_client_update_at as string,
    }))

  const payload = {
    activities: mergeRecentActivities(createdActivities, updatedActivities, limit),
  }

  dashboardRecentActivityCache.set(cacheKey, {
    payload,
    expiresAt: Date.now() + DASHBOARD_RECENT_ACTIVITY_CACHE_TTL_MS,
  })

  return NextResponse.json(payload, { headers: cacheHeaders })
}
