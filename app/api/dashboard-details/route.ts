import { NextResponse } from "next/server"
export const revalidate = 30
import { createAdminClient } from "@/lib/supabase/admin"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"
import { createPrivateApiCacheHeaders } from "@/lib/server/cache-headers"
import { getAccessibleProjectRows, getTeamAccessScope } from "@/lib/server/project-access"

type ActivityItem = {
  id: string
  title: string
  project: string
  status: string
  actor: "Admin" | "Client" | "Team Lead"
  timestamp: string
}

type DetailsCacheEntry = {
  expiresAt: number
  payload: Record<string, unknown>
}

const DASHBOARD_DETAILS_CACHE_TTL_MS = 5_000
const dashboardDetailsCache = new Map<string, DetailsCacheEntry>()
const cacheHeaders = createPrivateApiCacheHeaders(5, 15)

type ProjectRow = {
  id: number
  slug: string
  title: string
  created_at: string
  team_ids?: number[] | null
  submissions?: Record<string, unknown> | null
  created_by?: string | null
}

export async function GET(request: Request) {
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limitRaw = Number(searchParams.get("limit") ?? "50")
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50
  const workspaceId = request.headers.get("x-workspace-id")?.trim() || "-"
  const cacheKey = `dashboard-details:${limit}:${identity.userId}:${identity.role ?? ""}:${identity.email ?? ""}:${workspaceId}`
  const cached = dashboardDetailsCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload, { headers: cacheHeaders })
  }
  if (cached) {
    dashboardDetailsCache.delete(cacheKey)
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ activities: [] }, { headers: cacheHeaders })
  }

  const { memberTeamIds } = await getTeamAccessScope(admin, {
    userId: identity.userId,
    email: identity.email,
  })
  const selectColumns = "id,slug,title,created_at,submissions,created_by"
  const rows = await getAccessibleProjectRows<ProjectRow>(
    admin,
    { userId: identity.userId, email: identity.email },
    selectColumns,
    memberTeamIds,
  )

  const visibleProjects = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    createdAt: row.created_at,
    submissions: (row.submissions as Record<string, unknown>) ?? {},
  }))
  const activities: ActivityItem[] = []

  visibleProjects.forEach((project) => {
    activities.push({
      id: `${project.slug}-created`,
      title: "Project created",
      project: project.title,
      status: "created",
      actor: "Admin",
      timestamp: project.createdAt,
    })

    const submissions = (project.submissions || {}) as Record<string, unknown>
    const lastClientUpdate = submissions.__last_client_update
    if (typeof lastClientUpdate === "string" && lastClientUpdate.trim()) {
      activities.push({
        id: `${project.slug}-client-update-${lastClientUpdate}`,
        title: "Client updated checklist",
        project: project.title,
        status: "updated",
        actor: "Client",
        timestamp: lastClientUpdate,
      })
    }
  })

  const payload = {
    activities: activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit),
  }

  dashboardDetailsCache.set(cacheKey, {
    payload,
    expiresAt: Date.now() + DASHBOARD_DETAILS_CACHE_TTL_MS,
  })

  return NextResponse.json(payload, { headers: cacheHeaders })
}
