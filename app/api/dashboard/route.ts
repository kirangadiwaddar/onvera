import { NextResponse } from "next/server"
import { attachRelations, getStoreData } from "@/lib/server/data-store"
import { filterProjectsForIdentity } from "@/lib/auth/access"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"
import type { RequestIdentity } from "@/lib/auth/request-identity"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const revalidate = 0

type DashboardCacheEntry = {
  expiresAt: number
  payload: Record<string, unknown>
}

const DASHBOARD_CACHE_TTL_MS = 8_000
const ACTIVITIES_CACHE_TTL_MS = 5_000
const dashboardCache = new Map<string, DashboardCacheEntry>()

type ActivityItem = {
  id: string
  title: string
  project: string
  status: string
  actor: "Admin" | "Client" | "Team Lead"
  timestamp: string
}

type SubmissionValue = {
  value?: string
  status?: string
  submittedAt?: string
}

type DynamicRow = {
  name?: string
  url?: string
  status?: string
  submittedAt?: string
}

type ActivityTeamRow = {
  id: number
  lead?: { email?: string | null } | null
  members?: Array<{ email?: string | null }> | null
  created_by?: string | null
}

type ActivityProjectRow = {
  id: number
  slug: string
  title: string
  status: string
  created_at: string
  updated_at?: string | null
  team_ids?: number[] | null
  extra_members?: Array<{ email?: string | null; accessToken?: string | null }> | null
  submissions?: Record<string, unknown> | null
  created_by?: string | null
}

async function getVisibleProjectsForActivities(identity: RequestIdentity) {
  const admin = createAdminClient()
  if (!admin) return [] as Array<{
    id: number
    slug: string
    title: string
    status: string
    createdAt: string
    updatedAt?: string
    teamIds: number[]
    extraMembers: Array<{ email?: string; accessToken?: string | null }>
    submissions: Record<string, unknown>
    createdBy: string | null
  }>

  const [{ data: teamRows, error: teamsError }, { data: projectRows, error: projectsError }] = await Promise.all([
    admin.from("teams").select("id,lead,members,created_by"),
    admin
      .from("projects")
      .select("id,slug,title,status,created_at,updated_at,team_ids,extra_members,submissions,created_by"),
  ])

  if (teamsError || projectsError || !teamRows || !projectRows) {
    return []
  }

  const teams = (teamRows as ActivityTeamRow[]).map((row) => ({
    id: row.id,
    lead: row.lead ? { email: row.lead.email ?? undefined } : undefined,
    members: Array.isArray(row.members)
      ? row.members.map((member) => ({ email: member?.email ?? undefined }))
      : [],
    createdBy: row.created_by ?? null,
  }))

  const projects = (projectRows as ActivityProjectRow[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
    teamIds: row.team_ids ?? [],
    extraMembers: Array.isArray(row.extra_members)
      ? row.extra_members.map((member) => ({
          email: member?.email ?? undefined,
          accessToken: member?.accessToken ?? null,
        }))
      : [],
    submissions: (row.submissions as Record<string, unknown>) ?? {},
    createdBy: row.created_by ?? null,
  }))

  return filterProjectsForIdentity(projects, teams, identity)
}

function formatLabel(value: string) {
  return value
    .replace(/^custom-/, "")
    .replace(/[_-]+/g, " ")
    .trim()
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limitRaw = Number(searchParams.get("limit") ?? "50")
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50
  const scope = searchParams.get("scope")
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const workspaceId = request.headers.get("x-workspace-id")?.trim() || "-"
  const cacheKey = `dashboard:${scope || "full"}:${limit}:${identity.userId}:${identity.role ?? ""}:${identity.email ?? ""}:${workspaceId}`
  const cached = dashboardCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload)
  }
  if (cached) {
    dashboardCache.delete(cacheKey)
  }

  if (scope === "activities") {
    const visibleProjects = await getVisibleProjectsForActivities(identity)
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

    const admin = createAdminClient()
    if (admin && visibleProjects.length > 0) {
      const slugs = visibleProjects.map((project) => project.slug)
      const { data } = await admin
        .from("onboarding_tokens")
        .select("token, project_slug, created_at")
        .in("project_slug", slugs)
        .order("created_at", { ascending: false })
        .limit(30)

      if (Array.isArray(data)) {
        data.forEach((row) => {
          const project = visibleProjects.find((item) => item.slug === row.project_slug)
          if (!project) return
          activities.push({
            id: `onboarding-${row.token}`,
            title: "Client access link generated",
            project: project.title,
            status: "generated",
            actor: "Admin",
            timestamp: row.created_at,
          })
        })
      }
    }

    if (admin && identity.email) {
      const { data: mentions } = await admin
        .from("project_note_mentions")
        .select("note_id, project_id, created_at")
        .ilike("mentioned_email", identity.email)
        .order("created_at", { ascending: false })
        .limit(50)

      const mentionRows = Array.isArray(mentions) ? mentions : []
      if (mentionRows.length > 0) {
        const noteIds = mentionRows.map((row) => row.note_id).filter(Boolean) as string[]
        const { data: noteRows } = await admin
          .from("project_notes")
          .select("id, author_name")
          .in("id", noteIds)

        const authorByNote = new Map<string, string>()
        ;(noteRows || []).forEach((row) => {
          authorByNote.set(String(row.id), String(row.author_name))
        })

        mentionRows.forEach((row) => {
          const project = visibleProjects.find((item) => item.id === row.project_id)
          if (!project) return
          const authorName = authorByNote.get(String(row.note_id)) || "Someone"
          activities.push({
            id: `mention-${row.note_id}-${row.created_at}`,
            title: `${authorName} mentioned you in a note`,
            project: project.title,
            status: "mention",
            actor: "Team Lead",
            timestamp: row.created_at,
          })
        })
      }
    }

    const payload = {
      activities: activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit),
    }
    dashboardCache.set(cacheKey, { payload, expiresAt: Date.now() + ACTIVITIES_CACHE_TTL_MS })
    return NextResponse.json(payload)
  }

  const { projects, teams, templates } = await getStoreData({ includeTemplateStructure: false })
  const visibleProjects = filterProjectsForIdentity(projects, teams, identity)

  const completed = visibleProjects.filter((project) => project.status === "completed")
  const waiting = visibleProjects.filter((project) => project.status === "waiting")
  const overdue = visibleProjects.filter((project) => project.status === "overdue")
  const ongoing = visibleProjects.filter((project) => project.status === "ongoing")

  const latestOngoing = [...ongoing]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)
    .map((project) => attachRelations(project, teams, templates, { includeTemplateStructure: false }))

  const latestWaitingOverdue = [...visibleProjects]
    .filter((project) => project.status === "waiting" || project.status === "overdue")
    .sort((a, b) => {
      if (a.status !== b.status) {
        if (a.status === "overdue") return -1
        if (b.status === "overdue") return 1
      }

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
    .slice(0, 6)
    .map((project) => attachRelations(project, teams, templates, { includeTemplateStructure: false }))

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

    if (
      project.status !== "ongoing" &&
      project.updatedAt &&
      new Date(project.updatedAt).getTime() > new Date(project.createdAt).getTime()
    ) {
      activities.push({
        id: `${project.slug}-status-${project.updatedAt}`,
        title: `Project status is ${project.status}`,
        project: project.title,
        status: project.status,
        actor: "Admin",
        timestamp: project.updatedAt,
      })
    }

    Object.entries(submissions).forEach(([key, raw]) => {
      if (key === "__last_client_update") return
      if (key === "__custom_sections") return

      if (Array.isArray(raw)) {
        raw.forEach((row, index) => {
          if (!row || typeof row !== "object") return
          const dynamic = row as DynamicRow
          if (!dynamic.submittedAt) return
          const status = dynamic.status || "submitted"
          const label = formatLabel(dynamic.name || key || `row-${index + 1}`)
          const actor = status === "submitted" ? "Client" : "Team Lead"
          const title =
            status === "approved"
              ? `${label} approved`
              : status === "rejected"
                ? `${label} rejected`
                : `${label} submitted`
          activities.push({
            id: `${project.slug}-${key}-${index}-${dynamic.submittedAt}-${status}`,
            title,
            project: project.title,
            status,
            actor,
            timestamp: dynamic.submittedAt,
          })
        })
        return
      }

      if (!raw || typeof raw !== "object") return
      const value = raw as SubmissionValue
      if (!value.submittedAt) return
      const status = value.status || "submitted"
      const label = formatLabel(key)
      const actor = status === "submitted" ? "Client" : "Team Lead"
      const title =
        status === "approved"
          ? `${label} approved`
          : status === "rejected"
            ? `${label} rejected`
            : `${label} submitted`
      activities.push({
        id: `${project.slug}-${key}-${value.submittedAt}-${status}`,
        title,
        project: project.title,
        status,
        actor,
        timestamp: value.submittedAt,
      })
    })
  })

  const admin = createAdminClient()
  if (admin && visibleProjects.length > 0) {
    const slugs = visibleProjects.map((project) => project.slug)
    const { data } = await admin
      .from("onboarding_tokens")
      .select("token, project_slug, created_at")
      .in("project_slug", slugs)
      .order("created_at", { ascending: false })
      .limit(30)

    if (Array.isArray(data)) {
      data.forEach((row) => {
        const project = visibleProjects.find((item) => item.slug === row.project_slug)
        if (!project) return
        activities.push({
          id: `onboarding-${row.token}`,
          title: "Client access link generated",
          project: project.title,
          status: "generated",
          actor: "Admin",
          timestamp: row.created_at,
        })
      })
    }
  }

  if (admin && identity.email) {
    const { data: mentions } = await admin
      .from("project_note_mentions")
      .select("note_id, project_id, created_at")
      .ilike("mentioned_email", identity.email)
      .order("created_at", { ascending: false })
      .limit(50)

    const mentionRows = Array.isArray(mentions) ? mentions : []
    if (mentionRows.length > 0) {
      const noteIds = mentionRows.map((row) => row.note_id).filter(Boolean) as string[]
      const { data: noteRows } = await admin
        .from("project_notes")
        .select("id, author_name")
        .in("id", noteIds)

      const authorByNote = new Map<string, string>()
      ;(noteRows || []).forEach((row) => {
        authorByNote.set(String(row.id), String(row.author_name))
      })

      mentionRows.forEach((row) => {
        const project = visibleProjects.find((item) => item.id === row.project_id)
        if (!project) return
        const authorName = authorByNote.get(String(row.note_id)) || "Someone"
        activities.push({
          id: `mention-${row.note_id}-${row.created_at}`,
          title: `${authorName} mentioned you in a note`,
          project: project.title,
          status: "mention",
          actor: "Team Lead",
          timestamp: row.created_at,
        })
      })
    }
  }

  const recentActivities = activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)

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
      latestOngoing,
      latestWaitingOverdue,
    },
    activities: recentActivities,
  }
  dashboardCache.set(cacheKey, { payload, expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS })
  return NextResponse.json(payload)
}
