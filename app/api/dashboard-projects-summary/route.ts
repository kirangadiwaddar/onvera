import { NextResponse } from "next/server"

import { getRequestIdentityFromRequestWithOptions } from "@/lib/auth/request-identity"
import { resolveDashboardWorkspaceId } from "@/lib/server/dashboard-data"
import { createAdminClient } from "@/lib/supabase/admin"

type DashboardProjectsSummaryCacheEntry = {
  expiresAt: number
  payload: Record<string, unknown>
}

const DASHBOARD_PROJECTS_SUMMARY_CACHE_TTL_MS = 8_000
const dashboardProjectsSummaryCache = new Map<string, DashboardProjectsSummaryCacheEntry>()

export async function GET(request: Request) {
  const identity = await getRequestIdentityFromRequestWithOptions(request, {
    resolveWorkspaceAccess: true,
  })
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const workspaceId = resolveDashboardWorkspaceId(request, identity)
  const cacheKey = `dashboard-projects-summary:${identity.userId}:${identity.role ?? ""}:${identity.email ?? ""}:${workspaceId}`
  const cached = dashboardProjectsSummaryCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload)
  }
  if (cached) {
    dashboardProjectsSummaryCache.delete(cacheKey)
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ lists: { latestWaitingOverdue: [] } })
  }

  const { data: overdueRows } = await admin
    .from("projects")
    .select("id,slug,title,status,created_at,avatar_src,template_id")
    .eq("created_by", workspaceId)
    .eq("status", "overdue")
    .order("created_at", { ascending: true })
    .limit(6)

  const remaining = Math.max(0, 6 - (overdueRows?.length ?? 0))
  const { data: waitingRows } = remaining > 0
    ? await admin
        .from("projects")
        .select("id,slug,title,status,created_at,avatar_src,template_id")
        .eq("created_by", workspaceId)
        .eq("status", "waiting")
        .order("created_at", { ascending: true })
        .limit(remaining)
    : { data: [] as Array<{ id: number; slug: string; title: string; status: string; created_at: string; avatar_src?: string | null; template_id: string }> }

  const rows = [...(overdueRows || []), ...(waitingRows || [])]
  const templateIds = Array.from(new Set(rows.map((row) => row.template_id).filter(Boolean)))
  const [templatesById, templatesByKey] = templateIds.length
    ? await Promise.all([
        admin.from("templates").select("id,title,template_key").in("id", templateIds),
        admin.from("templates").select("id,title,template_key").in("template_key", templateIds),
      ])
    : [
        { data: [] as Array<{ id: string; title: string; template_key?: string | null }>, error: null },
        { data: [] as Array<{ id: string; title: string; template_key?: string | null }>, error: null },
      ]

  const templateTitleByKey = new Map<string, string>()
  ;[...(templatesById.data || []), ...(templatesByKey.data || [])].forEach((row) => {
    templateTitleByKey.set(row.id, row.title)
    if (row.template_key) templateTitleByKey.set(row.template_key, row.title)
  })

  const payload = {
    lists: {
      latestWaitingOverdue: rows.map((project) => ({
        id: project.id,
        slug: project.slug,
        title: project.title,
        status: project.status as "overdue" | "waiting",
        createdAt: project.created_at,
        avatarSrc: project.avatar_src ?? undefined,
        templateTitle: templateTitleByKey.get(project.template_id) || "Unknown",
      })),
    },
  }

  dashboardProjectsSummaryCache.set(cacheKey, {
    payload,
    expiresAt: Date.now() + DASHBOARD_PROJECTS_SUMMARY_CACHE_TTL_MS,
  })

  return NextResponse.json(payload)
}
