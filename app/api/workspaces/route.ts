import { NextResponse } from "next/server"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStoreData } from "@/lib/server/data-store"

type WorkspaceItem = {
  id: string
  name: string
  email: string | null
  avatar?: string | null
  plan: string | null
  role: "super_admin" | "team_lead" | "team_member" | "project_member"
}

const normalizeEmail = (value?: string | null) => (value || "").trim().toLowerCase()

export async function GET(request: Request) {
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ workspaces: [] as WorkspaceItem[] })
  }

  const { teams, projects } = await getStoreData({ includeRegisteredEmails: true })
  const email = normalizeEmail(identity.email)

  const workspaceIds = new Set<string>()

  teams.forEach((team) => {
    if (!team.createdBy) return
    const leadMatch = normalizeEmail(team.lead?.email) === email
    const memberMatch = (team.members || []).some(
      (member) => normalizeEmail(member.email) === email,
    )
    if (leadMatch || memberMatch) {
      workspaceIds.add(team.createdBy)
    }
  })

  projects.forEach((project) => {
    if (!project.createdBy) return
    const projectTeamIds = Array.isArray(project.teamIds) ? project.teamIds : []
    const linkedTeams = teams.filter((team) => projectTeamIds.includes(team.id))
    const teamMatch = linkedTeams.some((team) => {
      const leadMatch = normalizeEmail(team.lead?.email) === email
      const memberMatch = (team.members || []).some(
        (member) => normalizeEmail(member.email) === email,
      )
      return leadMatch || memberMatch
    })
    const externalMatch = (project.extraMembers || []).some(
      (member) => normalizeEmail(member.email) === email,
    )
    if (teamMatch || externalMatch) {
      workspaceIds.add(project.createdBy)
    }
  })

  const ownsWorkspace =
    teams.some((team) => team.createdBy === identity.userId) ||
    projects.some((project) => project.createdBy === identity.userId) ||
    identity.role === "super_admin"
  if (identity.userId && ownsWorkspace) {
    workspaceIds.add(identity.userId)
  }

  const ids = Array.from(workspaceIds)

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, plan")
    .in("id", ids)

  const nameById = new Map<string, string>()
  const planById = new Map<string, string | null>()
  ;(profiles || []).forEach((profile) => {
    if (!profile?.id) return
    nameById.set(profile.id, profile.full_name ?? "")
    planById.set(profile.id, profile.plan ?? null)
  })

  const emailById = new Map<string, string>()
  const avatarById = new Map<string, string | null>()
  let page = 1
  const perPage = 1000
  while (true) {
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
      if (!user?.id || !workspaceIds.has(user.id)) return
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

  const workspaceRoleFor = (workspaceId: string): WorkspaceItem["role"] => {
    if (identity.userId === workspaceId) return "super_admin"
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

  return NextResponse.json({ workspaces })
}
