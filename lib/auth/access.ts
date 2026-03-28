import type { RequestIdentity } from "@/lib/auth/request-identity"

type MemberLike = {
  email?: string
}

type TeamLike = {
  id: number
  lead?: MemberLike
  members?: MemberLike[]
  createdBy?: string | null
}

type ProjectLike = {
  id: number
  slug: string
  teamIds: number[]
  extraMembers?: MemberLike[]
  createdBy?: string | null
}

export function isAdminRole(role?: string | null) {
  return role === "super_admin" || role === "team_lead"
}

function normalizeEmail(value?: string | null) {
  return (value || "").trim().toLowerCase()
}

function isTeamMemberInTeam(team: TeamLike, email: string) {
  const target = normalizeEmail(email)
  const leadEmail = normalizeEmail(team.lead?.email)
  if (leadEmail && leadEmail === target) return true
  return (team.members || []).some((member) => normalizeEmail(member.email) === target)
}

function isMemberInProject(project: ProjectLike, teams: TeamLike[], email: string) {
  const target = normalizeEmail(email)
  if (!target) return false

  const inExtra = (project.extraMembers || []).some((member) => normalizeEmail(member.email) === target)
  if (inExtra) return true

  return teams
    .filter((team) => project.teamIds.includes(team.id))
    .some((team) => isTeamMemberInTeam(team, target))
}

// Request identity is now derived from Authorization bearer tokens in API routes.

export function filterProjectsForIdentity<T extends ProjectLike, U extends TeamLike>(
  projects: T[],
  teams: U[],
  identity: RequestIdentity | null,
) {
  if (!identity) return [] as T[]
  const ownedProjects = projects.filter((project) => project.createdBy === identity.userId)

  const email = identity.email
  if (!email) return [] as T[]

  const memberProjects = projects.filter((project) => isMemberInProject(project, teams, email))

  if (isAdminRole(identity.role)) {
    const combined = new Map<number, T>()
    ownedProjects.forEach((project) => combined.set(project.id, project))
    memberProjects.forEach((project) => combined.set(project.id, project))
    return Array.from(combined.values())
  }

  if (identity.role === "project_member" || identity.role === "team_member") {
    const combined = new Map<number, T>()
    ownedProjects.forEach((project) => combined.set(project.id, project))
    memberProjects.forEach((project) => combined.set(project.id, project))
    return Array.from(combined.values())
  }

  return ownedProjects
}

export function filterTeamsForIdentity<T extends TeamLike>(teams: T[], identity: RequestIdentity | null) {
  if (!identity) return [] as T[]
  const ownedTeams = teams.filter((team) => team.createdBy === identity.userId)

  const email = identity.email
  if (!email) return [] as T[]

  const memberTeams = teams.filter((team) => isTeamMemberInTeam(team, email))

  if (isAdminRole(identity.role)) {
    const combined = new Map<number, T>()
    ownedTeams.forEach((team) => combined.set(team.id, team))
    memberTeams.forEach((team) => combined.set(team.id, team))
    return Array.from(combined.values())
  }

  if (identity.role === "project_member" || identity.role === "team_member") {
    const combined = new Map<number, T>()
    ownedTeams.forEach((team) => combined.set(team.id, team))
    memberTeams.forEach((team) => combined.set(team.id, team))
    return Array.from(combined.values())
  }

  return ownedTeams
}

export function isLeadForProject<U extends TeamLike>(project: ProjectLike, teams: U[], email?: string | null) {
  const target = normalizeEmail(email)
  if (!target) return false

  return teams
    .filter((team) => project.teamIds.includes(team.id))
    .some((team) => normalizeEmail(team.lead?.email) === target)
}
