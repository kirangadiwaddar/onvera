import type { SupabaseClient } from "@supabase/supabase-js"

type IdentityLike = {
  userId: string
  email: string | null
}

export type TeamAccessRow = {
  id: number
  lead?: { email?: string | null } | null
  members?: Array<{ email?: string | null }> | null
  created_by?: string | null
}

type TeamScopeCacheEntry = {
  expiresAt: number
  teams: TeamAccessRow[]
  memberTeamIds: number[]
}

type ProjectRowsCacheEntry = {
  expiresAt: number
  rows: Array<{ id: number }>
}

const TEAM_SCOPE_CACHE_TTL_MS = 8_000
const PROJECT_ROWS_CACHE_TTL_MS = 6_000
const teamScopeCache = new Map<string, TeamScopeCacheEntry>()
const projectRowsCache = new Map<string, ProjectRowsCacheEntry>()

const normalizeEmail = (value?: string | null) => (value || "").trim().toLowerCase()

function isTeamMemberInTeam(team: TeamAccessRow, email: string | null) {
  const target = normalizeEmail(email)
  if (!target) return false
  const leadEmail = normalizeEmail(team.lead?.email ?? null)
  if (leadEmail && leadEmail === target) return true
  return (team.members || []).some((member) => normalizeEmail(member.email ?? null) === target)
}

function getTeamScopeCacheKey(identity: IdentityLike) {
  return `team-scope:${identity.userId}:${identity.email ?? ""}`
}

function getProjectRowsCacheKey(identity: IdentityLike, selectColumns: string, memberTeamIds: number[]) {
  return `project-rows:${identity.userId}:${identity.email ?? ""}:${selectColumns}:${memberTeamIds.join(".")}`
}

export async function getTeamAccessScope(
  admin: SupabaseClient,
  identity: IdentityLike,
) {
  const cacheKey = getTeamScopeCacheKey(identity)
  const cached = teamScopeCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return { teams: cached.teams, memberTeamIds: cached.memberTeamIds }
  }
  if (cached) {
    teamScopeCache.delete(cacheKey)
  }

  const { data: accessTeams, error: teamsError } = await admin
    .from("teams")
    .select("id,lead,members,created_by")

  if (teamsError || !accessTeams) {
    return { teams: [] as TeamAccessRow[], memberTeamIds: [] as number[] }
  }

  const teams = accessTeams as TeamAccessRow[]
  const memberTeamIds = teams
    .filter((team) => isTeamMemberInTeam(team, identity.email ?? null))
    .map((team) => team.id)

  teamScopeCache.set(cacheKey, {
    teams,
    memberTeamIds,
    expiresAt: Date.now() + TEAM_SCOPE_CACHE_TTL_MS,
  })

  return { teams, memberTeamIds }
}

export async function getAccessibleProjectRows<T extends { id: number }>(
  admin: SupabaseClient,
  identity: IdentityLike,
  selectColumns: string,
  memberTeamIds: number[],
) {
  const cacheKey = getProjectRowsCacheKey(identity, selectColumns, memberTeamIds)
  const cached = projectRowsCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.rows as T[]
  }
  if (cached) {
    projectRowsCache.delete(cacheKey)
  }

  const ownedProjectsRequest = admin
    .from("projects")
    .select(selectColumns)
    .eq("created_by", identity.userId)

  const teamProjectsRequest = memberTeamIds.length > 0
    ? admin
        .from("projects")
        .select(selectColumns)
        .overlaps("team_ids", memberTeamIds)
    : Promise.resolve({ data: [], error: null })

  const emailFilter = identity.email ? [{ email: identity.email.toLowerCase() }] : []
  const extraMemberRequest = emailFilter.length > 0
    ? admin
        .from("projects")
        .select(selectColumns)
        .contains("extra_members", emailFilter)
    : Promise.resolve({ data: [], error: null })

  const [
    { data: ownedProjects, error: ownedError },
    { data: teamProjects, error: teamError },
    { data: extraMemberProjects, error: extraMemberError },
  ] = await Promise.all([ownedProjectsRequest, teamProjectsRequest, extraMemberRequest])

  if (ownedError || teamError) {
    return [] as T[]
  }

  const merged = new Map<number, T>()
  ;(ownedProjects as unknown as T[] | null | undefined)?.forEach((row) => merged.set(row.id, row))
  ;(teamProjects as unknown as T[] | null | undefined)?.forEach((row) => merged.set(row.id, row))
  if (!extraMemberError) {
    ;(extraMemberProjects as unknown as T[] | null | undefined)?.forEach((row) => merged.set(row.id, row))
  }

  const rows = Array.from(merged.values())
  projectRowsCache.set(cacheKey, {
    rows: rows as Array<{ id: number }>,
    expiresAt: Date.now() + PROJECT_ROWS_CACHE_TTL_MS,
  })
  return rows
}
