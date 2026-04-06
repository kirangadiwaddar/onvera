import { NextResponse } from "next/server"
import { attachRelations, getStoreData } from "@/lib/server/data-store"
import { filterProjectsForIdentity } from "@/lib/auth/access"
import { getRequestIdentityFromRequestWithOptions } from "@/lib/auth/request-identity"
import { createAdminClient } from "@/lib/supabase/admin"
import type { status } from "@/lib/project-status"

type WorkspaceItem = {
  id: string
  name: string
  email: string | null
  avatar?: string | null
  plan: string | null
  role: "super_admin" | "team_lead" | "team_member" | "project_member"
}

type ProjectSummary = {
  id: number
  slug: string
  title: string
  status: status
  createdAt: string
  updatedAt: string
  teamIds: number[]
  createdBy?: string | null
}

type ActivityItem = {
  id: string
  title: string
  project: string
  status: string
  actor: "Admin" | "Client" | "Team Lead"
  timestamp: string
}

type DashboardInitCacheEntry = {
  expiresAt: number
  payload: Record<string, unknown>
}

const DASHBOARD_INIT_CACHE_TTL_MS = 8_000
const dashboardInitCache = new Map<string, DashboardInitCacheEntry>()

const normalizeEmail = (value?: string | null) => (value || "").trim().toLowerCase()

function roleForWorkspace(
  workspaceId: string,
  identity: { userId: string; email: string | null },
  teams: Array<{ createdBy?: string | null; lead?: { email?: string }; members?: Array<{ email?: string }> }>,
  projects: Array<{ createdBy?: string | null; extraMembers?: Array<{ email?: string }> }>,
): WorkspaceItem["role"] {
  if (identity.userId === workspaceId) return "super_admin"
  const email = normalizeEmail(identity.email)
  const leadInTeam = teams.some(
    (team) => team.createdBy === workspaceId && normalizeEmail(team.lead?.email) === email,
  )
  if (leadInTeam) return "team_lead"
  const memberInTeam = teams.some(
    (team) =>
      team.createdBy === workspaceId &&
      (team.members || []).some((member) => normalizeEmail(member.email) === email),
  )
  if (memberInTeam) return "team_member"
  const memberInProject = projects.some(
    (project) =>
      project.createdBy === workspaceId &&
      (project.extraMembers || []).some((member) => normalizeEmail(member.email) === email),
  )
  if (memberInProject) return "project_member"
  return "project_member"
}

export async function GET(request: Request) {
  const identity = await getRequestIdentityFromRequestWithOptions(request, {
    resolveWorkspaceAccess: false,
  })
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const scope = searchParams.get("scope") || "full"
  const limitRaw = Number(searchParams.get("limit") ?? "50")
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50
  const workspaceId = request.headers.get("x-workspace-id")?.trim() || "-"
  const cacheKey = `dashboard-init:${scope}:${limit}:${identity.userId}:${identity.email ?? ""}:${identity.role ?? ""}:${workspaceId}`
  const cached = dashboardInitCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload)
  }
  if (cached) {
    dashboardInitCache.delete(cacheKey)
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ message: "Server unavailable" }, { status: 503 })
  }

  const [{ projects, teams, templates }, { data: userProfile }] = await Promise.all([
    getStoreData({ includeTemplateStructure: false }),
    admin
      .from("profiles")
      .select("id, full_name, role, plan")
      .eq("id", identity.userId)
      .maybeSingle(),
  ])

  const visibleProjects = filterProjectsForIdentity(projects, teams, identity)
  const projectSummary: ProjectSummary[] = visibleProjects.map((project) => ({
    id: project.id,
    slug: project.slug,
    title: project.title,
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt || project.createdAt,
    teamIds: project.teamIds ?? [],
    createdBy: project.createdBy ?? null,
  }))

  const workspaceIds = new Set<string>()
  const email = normalizeEmail(identity.email)
  teams.forEach((team) => {
    if (!team.createdBy) return
    const leadMatch = normalizeEmail(team.lead?.email) === email
    const memberMatch = (team.members || []).some((member) => normalizeEmail(member.email) === email)
    if (leadMatch || memberMatch) {
      workspaceIds.add(team.createdBy)
    }
  })
  visibleProjects.forEach((project) => {
    if (project.createdBy) workspaceIds.add(project.createdBy)
  })
  if (
    identity.role === "super_admin" ||
    teams.some((team) => team.createdBy === identity.userId) ||
    projects.some((project) => project.createdBy === identity.userId)
  ) {
    workspaceIds.add(identity.userId)
  }

  const ids = Array.from(workspaceIds)
  const { data: workspaceProfiles } = ids.length
    ? await admin
        .from("profiles")
        .select("id, full_name, plan")
        .in("id", ids)
    : { data: [] as Array<{ id: string; full_name: string | null; plan: string | null }> }

  const nameById = new Map<string, string>()
  const planById = new Map<string, string | null>()
  ;(workspaceProfiles || []).forEach((profile) => {
    nameById.set(profile.id, profile.full_name ?? "")
    planById.set(profile.id, profile.plan ?? null)
  })

  const emailById = new Map<string, string>()
  const avatarById = new Map<string, string | null>()
  const getUserById = (
    admin.auth.admin as unknown as {
      getUserById?: (id: string) => Promise<{
        data?: {
          user?: {
            id?: string
            email?: string | null
            user_metadata?: { avatar_url?: string | null } | null
          } | null
        }
      }>
    }
  ).getUserById

  if (typeof getUserById === "function") {
    const users = await Promise.all(
      ids.map(async (id) => {
        try {
          const result = await getUserById.call(admin.auth.admin, id)
          return result?.data?.user ?? null
        } catch {
          return null
        }
      }),
    )
    users.forEach((user) => {
      if (!user?.id) return
      if (user.email) emailById.set(user.id, user.email)
      avatarById.set(user.id, typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null)
    })
  }

  const workspaces: WorkspaceItem[] = ids.map((id) => ({
    id,
    name: nameById.get(id) || emailById.get(id) || "Workspace",
    email: emailById.get(id) || null,
    avatar: avatarById.get(id) ?? null,
    plan: planById.get(id) ?? null,
    role: roleForWorkspace(id, identity, teams, projects),
  }))

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

  const ongoingProjects = [...projectSummary]
    .filter((project) => project.status === "ongoing")
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 7)

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

  const recentActivities = activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)

  const payload = {
    user: {
      id: identity.userId,
      email: identity.email,
      fullName: userProfile?.full_name ?? null,
      role: (userProfile?.role ?? identity.role) || null,
      plan: (userProfile?.plan ?? identity.plan) || null,
    },
    workspaces: scope === "dashboard" ? [] : workspaces,
    projects: scope === "full" ? projectSummary : [],
    summary: {
      total: visibleProjects.length,
      completed: completed.length,
      waiting: waiting.length,
      overdue: overdue.length,
      ongoing: ongoing.length,
    },
    ongoingProjects,
    activities: scope === "shell" ? [] : recentActivities,
    dashboardData:
      scope === "shell"
        ? null
        : {
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
          },
    meta: {
      scope,
      limit,
    },
  }

  dashboardInitCache.set(cacheKey, {
    payload,
    expiresAt: Date.now() + DASHBOARD_INIT_CACHE_TTL_MS,
  })

  return NextResponse.json(payload)
}
