import { NextResponse } from "next/server"
export const revalidate = 30
import { createAdminClient } from "@/lib/supabase/admin"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"
import { createPrivateApiCacheHeaders } from "@/lib/server/cache-headers"
import { getAccessibleProjectRows, getTeamAccessScope } from "@/lib/server/project-access"
import type { status } from "@/lib/project-status"

type DashboardSummaryCacheEntry = {
  expiresAt: number
  payload: Record<string, unknown>
}

const DASHBOARD_SUMMARY_CACHE_TTL_MS = 8_000
const dashboardSummaryCache = new Map<string, DashboardSummaryCacheEntry>()
const cacheHeaders = createPrivateApiCacheHeaders(8, 24)

type ProjectRow = {
  id: number
  slug: string
  title: string
  status: status
  created_at: string
  avatar_src?: string | null
  template_id: string
  team_ids?: number[] | null
  created_by?: string | null
}

export async function GET(request: Request) {
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const workspaceId = request.headers.get("x-workspace-id")?.trim() || "-"
  const cacheKey = `dashboard-summary:${identity.userId}:${identity.role ?? ""}:${identity.email ?? ""}:${workspaceId}`
  const cached = dashboardSummaryCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload, { headers: cacheHeaders })
  }
  if (cached) {
    dashboardSummaryCache.delete(cacheKey)
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({
      stats: { total: 0, completed: 0, waiting: 0, overdue: 0, ongoing: 0 },
      charts: { completed: 0, total: 0 },
      lists: { latestWaitingOverdue: [] },
    }, { headers: cacheHeaders })
  }

  const { memberTeamIds } = await getTeamAccessScope(admin, {
    userId: identity.userId,
    email: identity.email,
  })
  const selectColumns = "id,slug,title,status,created_at,avatar_src,template_id,team_ids,created_by"
  const visibleProjects = await getAccessibleProjectRows<ProjectRow>(
    admin,
    { userId: identity.userId, email: identity.email },
    selectColumns,
    memberTeamIds,
  )
  const completed = visibleProjects.filter((project) => project.status === "completed")
  const waiting = visibleProjects.filter((project) => project.status === "waiting")
  const overdue = visibleProjects.filter((project) => project.status === "overdue")
  const ongoing = visibleProjects.filter((project) => project.status === "ongoing")

  const attentionBase = [...visibleProjects]
    .filter((project) => project.status === "waiting" || project.status === "overdue")
    .sort((a, b) => {
      if (a.status !== b.status) {
        if (a.status === "overdue") return -1
        if (b.status === "overdue") return 1
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
    .slice(0, 6)

  const templateIds = Array.from(new Set(attentionBase.map((project) => project.template_id).filter(Boolean)))
  const { data: templateRows } = templateIds.length
    ? await admin
        .from("templates")
        .select("id,title,template_key")
        .in("id", templateIds)
    : { data: [] as Array<{ id: string; title: string; template_key?: string | null }> }

  const templateTitleByKey = new Map<string, string>()
  ;(templateRows || []).forEach((row) => {
    templateTitleByKey.set(row.id, row.title)
    if (row.template_key) {
      templateTitleByKey.set(row.template_key, row.title)
    }
  })

  const latestWaitingOverdue = attentionBase.map((project) => ({
    id: project.id,
    slug: project.slug,
    title: project.title,
    status: project.status,
    createdAt: project.created_at,
    avatarSrc: project.avatar_src ?? undefined,
    templateTitle: templateTitleByKey.get(project.template_id) || "Unknown",
  }))

  const payload = {
    stats: {
      total: visibleProjects.length,
      completed: completed.length,
      waiting: waiting.length,
      overdue: overdue.length,
      ongoing: ongoing.length,
    },
    charts: {
      completed: completed.length,
      total: visibleProjects.length,
    },
    lists: {
      latestWaitingOverdue,
    },
  }

  dashboardSummaryCache.set(cacheKey, {
    payload,
    expiresAt: Date.now() + DASHBOARD_SUMMARY_CACHE_TTL_MS,
  })

  return NextResponse.json(payload, { headers: cacheHeaders })
}
