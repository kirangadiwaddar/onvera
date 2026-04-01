import { NextResponse } from "next/server"
import { getRequestIdentityFromRequestWithOptions } from "@/lib/auth/request-identity"
import { createAdminClient } from "@/lib/supabase/admin"

type WorkspaceItem = {
  id: string
  name: string
  email: string | null
  avatar?: string | null
  plan: string | null
  role: "super_admin" | "team_lead" | "team_member" | "project_member"
}

const normalizeEmail = (value?: string | null) => (value || "").trim().toLowerCase()

type WorkspaceCacheEntry = {
  expiresAt: number
  payload: { workspaces: WorkspaceItem[] }
}

const WORKSPACES_CACHE_TTL_MS = 12_000
const workspacesCache = new Map<string, WorkspaceCacheEntry>()

type TeamRow = {
  id: number
  created_by?: string | null
  lead?: { email?: string | null } | null
  members?: Array<{ email?: string | null }> | null
}

type ProjectRow = {
  id: number
  created_by?: string | null
  team_ids?: number[] | null
  extra_members?: Array<{ email?: string | null }> | null
}

export async function GET(request: Request) {
  const identity = await getRequestIdentityFromRequestWithOptions(request, {
    resolveWorkspaceAccess: false,
  })
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const cacheKey = `workspaces:${identity.userId}:${identity.email ?? ""}`
  const cached = workspacesCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload)
  }
  if (cached) {
    workspacesCache.delete(cacheKey)
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ workspaces: [] as WorkspaceItem[] })
  }

  const [{ data: teamRows, error: teamsError }, { data: projectRows, error: projectsError }] = await Promise.all([
    admin
      .from("teams")
      .select("id,created_by,lead,members"),
    admin
      .from("projects")
      .select("id,created_by,team_ids,extra_members"),
  ])
  if (teamsError || projectsError) {
    return NextResponse.json({ workspaces: [] as WorkspaceItem[] })
  }
  const teams = (teamRows || []) as TeamRow[]
  const projects = (projectRows || []) as ProjectRow[]
  const email = normalizeEmail(identity.email)
  const teamById = new Map<number, TeamRow>()
  teams.forEach((team) => {
    teamById.set(team.id, team)
  })

  const workspaceIds = new Set<string>()

  teams.forEach((team) => {
    if (!team.created_by) return
    const leadMatch = normalizeEmail(team.lead?.email) === email
    const memberMatch = (team.members || []).some(
      (member) => normalizeEmail(member.email) === email,
    )
    if (leadMatch || memberMatch) {
      workspaceIds.add(team.created_by)
    }
  })

  projects.forEach((project) => {
    if (!project.created_by) return
    const projectTeamIds = Array.isArray(project.team_ids) ? project.team_ids : []
    const linkedTeams = projectTeamIds
      .map((teamId) => teamById.get(teamId))
      .filter(Boolean) as TeamRow[]
    const teamMatch = linkedTeams.some((team) => {
      const leadMatch = normalizeEmail(team.lead?.email) === email
      const memberMatch = (team.members || []).some(
        (member) => normalizeEmail(member.email) === email,
      )
      return leadMatch || memberMatch
    })
    const externalMatch = (project.extra_members || []).some(
      (member) => normalizeEmail(member.email) === email,
    )
    if (teamMatch || externalMatch) {
      workspaceIds.add(project.created_by)
    }
  })

  const ownsWorkspace =
    teams.some((team) => team.created_by === identity.userId) ||
    projects.some((project) => project.created_by === identity.userId) ||
    identity.role === "super_admin"
  if (identity.userId && ownsWorkspace) {
    workspaceIds.add(identity.userId)
  }

  const ids = Array.from(workspaceIds)

  const { data: profiles } = ids.length
    ? await admin
        .from("profiles")
        .select("id, full_name, plan")
        .in("id", ids)
    : { data: [] as Array<{ id: string; full_name: string | null; plan: string | null }> }

  const nameById = new Map<string, string>()
  const planById = new Map<string, string | null>()
  ;(profiles || []).forEach((profile) => {
    if (!profile?.id) return
    nameById.set(profile.id, profile.full_name ?? "")
    planById.set(profile.id, profile.plan ?? null)
  })

  const emailById = new Map<string, string>()
  const avatarById = new Map<string, string | null>()

  const userIdsToLoad = ids.filter(Boolean)
  const getUserById = (admin.auth.admin as unknown as { getUserById?: (id: string) => Promise<{ data?: { user?: { id?: string; email?: string | null; user_metadata?: { avatar_url?: string | null } | null } | null }; error?: { message?: string } | null }> }).getUserById

  if (typeof getUserById === "function") {
    const userRows = await Promise.all(
      userIdsToLoad.map(async (id) => {
        try {
          const result = await getUserById.call(admin.auth.admin, id)
          return result?.data?.user ?? null
        } catch {
          return null
        }
      }),
    )
    userRows.forEach((user) => {
      if (!user?.id) return
      if (user.email) {
        emailById.set(user.id, user.email)
      }
      avatarById.set(
        user.id,
        typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null,
      )
    })
  } else {
    const unresolved = new Set(userIdsToLoad)
    let page = 1
    const perPage = 1000
    while (unresolved.size > 0) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
      if (error) {
        console.error("Supabase listUsers failed:", error.message)
        break
      }
      const users = Array.isArray((data as { users?: unknown })?.users)
        ? (data as { users: Array<{ id?: string; email?: string | null; user_metadata?: { avatar_url?: string | null } | null }> }).users
        : Array.isArray(data)
          ? (data as Array<{ id?: string; email?: string | null; user_metadata?: { avatar_url?: string | null } | null }>)
          : []
      users.forEach((user) => {
        if (!user?.id || !unresolved.has(user.id)) return
        unresolved.delete(user.id)
        if (user.email) {
          emailById.set(user.id, user.email)
        }
        avatarById.set(
          user.id,
          typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null,
        )
      })
      const nextPage = (data as { nextPage?: number | null } | null)?.nextPage
      if (!nextPage) break
      page = nextPage
    }
  }

  const workspaceRoleFor = (workspaceId: string): WorkspaceItem["role"] => {
    if (identity.userId === workspaceId) return "super_admin"
    const leadInTeam = teams.some(
      (team) => team.created_by === workspaceId && normalizeEmail(team.lead?.email) === email,
    )
    if (leadInTeam) return "team_lead"
    const memberInTeam = teams.some(
      (team) =>
        team.created_by === workspaceId &&
        (team.members || []).some((member) => normalizeEmail(member.email) === email),
    )
    if (memberInTeam) return "team_member"
    const memberInProject = projects.some(
      (project) =>
        project.created_by === workspaceId &&
        (project.extra_members || []).some((member) => normalizeEmail(member.email) === email),
    )
    if (memberInProject) return "project_member"
    return "project_member"
  }

  const workspaces: WorkspaceItem[] = ids.map((id) => {
    const name = nameById.get(id) || emailById.get(id) || "Workspace"
    return {
      id,
      name,
      email: emailById.get(id) || null,
      avatar: avatarById.get(id) ?? null,
      plan: planById.get(id) ?? null,
      role: workspaceRoleFor(id),
    }
  })

  const payload = { workspaces }
  workspacesCache.set(cacheKey, { payload, expiresAt: Date.now() + WORKSPACES_CACHE_TTL_MS })
  return NextResponse.json(payload)
}
