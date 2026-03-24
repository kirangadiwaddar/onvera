import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { attachRelations, getStoreData } from "@/lib/server/data-store"
import { isAdminRole } from "@/lib/auth/access"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"
import type { Team } from "@/types/team"
import type { Project } from "@/types/project"

type TeamProject = ReturnType<typeof attachRelations>

type TeamCacheEntry = {
  expiresAt: number
  payload: { team: Team; projects: TeamProject[] }
}

const TEAM_CACHE_TTL_MS = 10_000
const teamCache = new Map<string, TeamCacheEntry>()

function getCachedTeam(key: string) {
  const cached = teamCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload
  }
  if (cached) {
    teamCache.delete(key)
  }
  return null
}

function setCachedTeam(key: string, payload: TeamCacheEntry["payload"]) {
  teamCache.set(key, { payload, expiresAt: Date.now() + TEAM_CACHE_TTL_MS })
}

type MemberLike = {
  email?: string | null
  isRegistered?: boolean
}

type TeamRow = {
  id: number
  name: string
  slug: string
  description?: string | null
  status: "active" | "inactive"
  lead?: Team["lead"] | null
  members?: Team["members"] | null
  created_at: string
  created_by?: string | null
}

type ProjectRow = {
  id: number
  slug: string
  title: string
  status: Project["status"]
  template_id: string
  created_at: string
  updated_at?: string | null
  avatar_src?: string | null
  team_ids?: number[] | null
  extra_members?: Project["extraMembers"] | null
  created_by?: string | null
}

type TemplateRow = {
  id: string
  title: string
  template_key?: string | null
  icon?: string | null
  badge?: string | null
  is_default?: boolean | null
}

const normalizeEmail = (value?: string | null) => (value || "").trim().toLowerCase()

const isTeamMember = (team: TeamRow, email?: string | null) => {
  const target = normalizeEmail(email)
  if (!target) return false
  const leadEmail = normalizeEmail(team.lead?.email)
  if (leadEmail && leadEmail === target) return true
  return (team.members || []).some((member) => normalizeEmail(member.email) === target)
}

const canViewTeam = (team: TeamRow, identity: { userId: string; email?: string | null; role?: string | null }) => {
  const owned = team.created_by === identity.userId
  const member = isTeamMember(team, identity.email ?? null)
  if (isAdminRole(identity.role)) return owned || member
  if (identity.role === "project_member" || identity.role === "team_member") return owned || member
  return owned
}

const normalizeTeam = (row: TeamRow): Team => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description ?? "",
  status: row.status,
  lead: row.lead
    ? {
        ...(row.lead as Team["lead"]),
        email: row.lead.email ?? undefined,
      } as Team["lead"]
    : undefined,
  members: Array.isArray(row.members)
    ? (row.members.map((member) => ({
        ...(member as Team["members"][number]),
        email: member?.email ?? undefined,
      })) as Team["members"])
    : [],
  createdAt: row.created_at,
})

const normalizeProject = (row: ProjectRow): Project => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  status: row.status,
  templateId: row.template_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at ?? "",
  avatarSrc: row.avatar_src ?? undefined,
  teamIds: row.team_ids ?? [],
  extraMembers: Array.isArray(row.extra_members)
    ? row.extra_members.map((member) => ({
        ...(member as NonNullable<Project["extraMembers"]>[number]),
        email: member?.email ?? undefined,
      }))
    : [],
  memberIds: [],
  submissions: {},
})

const normalizeTemplate = (row: TemplateRow) => ({
  id: String(row.id ?? ""),
  title: String(row.title ?? "Untitled"),
  description: "",
  icon: String(row.icon ?? "Globe"),
  badge: String(row.badge ?? "Custom"),
  templateKey: row.template_key ?? row.id,
  isDefault: typeof row.is_default === "boolean" ? row.is_default : undefined,
})

async function enrichRegisteredEmails(
  admin: ReturnType<typeof createAdminClient>,
  team: TeamRow,
  projects: ProjectRow[],
) {
  if (!admin) return { team, projects }

  const candidateEmails = new Set<string>()
  const collectEmail = (email?: string | null) => {
    if (email) candidateEmails.add(email.toLowerCase())
  }
  collectEmail(team.lead?.email ?? null)
  ;(team.members || []).forEach((member) => collectEmail(member.email ?? null))
  projects.forEach((project) => {
    ;(project.extra_members || []).forEach((member) => collectEmail(member.email ?? null))
  })

  if (candidateEmails.size === 0) return { team, projects }

  const registeredEmails = new Set<string>()
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error("Supabase listUsers failed:", error.message)
      break
    }

    const users = Array.isArray((data as { users?: unknown })?.users)
      ? (data as { users: Array<{ email?: string | null }> }).users
      : Array.isArray(data)
        ? (data as Array<{ email?: string | null }>)
        : []

    users.forEach((user) => {
      const email = user.email?.toLowerCase()
      if (email && candidateEmails.has(email)) {
        registeredEmails.add(email)
      }
    })

    const nextPage = (data as { nextPage?: number | null } | null)?.nextPage
    if (!nextPage) break
    page = nextPage
  }

  const isRegisteredEmail = (email?: string | null) =>
    !!(email && registeredEmails.has(email.toLowerCase()))

  const enrichedTeam: TeamRow = {
    ...team,
    lead: team.lead ? { ...team.lead, isRegistered: isRegisteredEmail(team.lead.email ?? null) } : team.lead,
    members: (team.members || []).map((member) => ({
      ...member,
      isRegistered: isRegisteredEmail(member.email ?? null),
    })),
  }

  const enrichedProjects = projects.map((project) => ({
    ...project,
    extra_members: (project.extra_members || []).map((member) => ({
      ...member,
      isRegistered: isRegisteredEmail(member.email ?? null),
    })),
  }))

  return { team: enrichedTeam, projects: enrichedProjects }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const bypassCache = searchParams.get("cache") === "0"
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const cacheKey = `team:${slug}:${identity.userId}:${identity.role ?? ""}:${identity.email ?? ""}`
  if (!bypassCache) {
    const cached = getCachedTeam(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ message: "Supabase is not configured" }, { status: 500 })
  }

  const { data: teamRow, error: teamError } = await admin
    .from("teams")
    .select("id,name,slug,description,status,lead,members,created_at,created_by")
    .eq("slug", slug)
    .maybeSingle()

  if (teamError) {
    return NextResponse.json({ message: teamError.message }, { status: 500 })
  }

  if (!teamRow) {
    return NextResponse.json({ message: "Team not found" }, { status: 404 })
  }

  const teamRecord = teamRow as TeamRow
  if (!canViewTeam(teamRecord, identity)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const { data: projectRows, error: projectError } = await admin
    .from("projects")
    .select("id,slug,title,status,template_id,created_at,updated_at,avatar_src,team_ids,extra_members,created_by")
    .contains("team_ids", [teamRecord.id])
    .order("created_at", { ascending: false })

  if (projectError) {
    return NextResponse.json({ message: projectError.message }, { status: 500 })
  }

  const projectsForTeam = Array.isArray(projectRows) ? (projectRows as ProjectRow[]) : []
  const { team: enrichedTeam, projects: enrichedProjects } = await enrichRegisteredEmails(
    admin,
    teamRecord,
    projectsForTeam,
  )

  const teamIds = new Set<number>()
  projectsForTeam.forEach((project) => {
    ;(project.team_ids || []).forEach((id) => teamIds.add(id))
  })
  teamIds.add(enrichedTeam.id)
  const teamIdList = Array.from(teamIds)

  const { data: relatedTeams, error: teamsError } = teamIdList.length
    ? await admin
        .from("teams")
        .select("id,name,slug,description,status,lead,members,created_at,created_by")
        .in("id", teamIdList)
    : { data: [], error: null }

  if (teamsError) {
    return NextResponse.json({ message: teamsError.message }, { status: 500 })
  }

  const templateIds = Array.from(
    new Set(projectsForTeam.map((project) => project.template_id).filter(Boolean)),
  )

  const templatesById = templateIds.length
    ? await admin
        .from("templates")
        .select("id,title,template_key,icon,badge,is_default")
        .in("id", templateIds)
    : { data: [], error: null }

  const templatesByKey = templateIds.length
    ? await admin
        .from("templates")
        .select("id,title,template_key,icon,badge,is_default")
        .in("template_key", templateIds)
    : { data: [], error: null }

  if (templatesById.error || templatesByKey.error) {
    return NextResponse.json(
      { message: templatesById.error?.message ?? templatesByKey.error?.message ?? "Template fetch failed" },
      { status: 500 },
    )
  }

  const templateMap = new Map<string, TemplateRow>()
  ;(templatesById.data || []).forEach((row) => templateMap.set(String((row as TemplateRow).id), row as TemplateRow))
  ;(templatesByKey.data || []).forEach((row) => {
    const key = (row as TemplateRow).template_key ?? (row as TemplateRow).id
    templateMap.set(String(key), row as TemplateRow)
  })

  const templates = Array.from(templateMap.values()).map(normalizeTemplate)
  const normalizedTeams = Array.isArray(relatedTeams)
    ? (relatedTeams as TeamRow[]).map(normalizeTeam)
    : []
  const normalizedProjects = enrichedProjects.map(normalizeProject)
  const team = normalizeTeam(enrichedTeam)

  const teamProjects = normalizedProjects.map((project) =>
    attachRelations(project, normalizedTeams, templates, { includeTemplateStructure: false }),
  )

  if (!team) {
    return NextResponse.json({ message: "Team not found" }, { status: 404 })
  }

  const payload = { team, projects: teamProjects }
  if (!bypassCache) {
    setCachedTeam(cacheKey, payload)
  }
  return NextResponse.json(payload)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { teams } = await getStoreData({ bypassCache: true })
  const currentTeam = teams.find((item) => item.slug === slug)
  if (!currentTeam) {
    return NextResponse.json({ message: "Team not found" }, { status: 404 })
  }
  if (currentTeam.createdBy !== identity.userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as
    | {
        name?: string
        description?: string
        status?: "active" | "inactive"
        lead?: unknown
        members?: unknown[]
      }
    | null

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid team payload" }, { status: 400 })
  }

  const admin = createAdminClient()

  if (!admin) {
    return NextResponse.json({ message: "Supabase is not configured" }, { status: 500 })
  }

  const updatePayload: {
    name?: string
    description?: string
    status?: "active" | "inactive"
    lead?: unknown
    members?: unknown[]
  } = {}

  if (typeof body.name === "string" && body.name.trim()) {
    updatePayload.name = body.name.trim()
  }

  if (typeof body.description === "string") {
    updatePayload.description = body.description.trim()
  }

  if (body.status === "active" || body.status === "inactive") {
    updatePayload.status = body.status
  }

  if (body.lead === null || typeof body.lead === "object") {
    updatePayload.lead = body.lead ?? null
  }

  if (Array.isArray(body.members)) {
    updatePayload.members = body.members
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ message: "No updates provided" }, { status: 400 })
  }

  const { error } = await admin.from("teams").update(updatePayload).eq("slug", slug)

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  const { projects, teams: allTeams, templates } = await getStoreData({ bypassCache: true, includeRegisteredEmails: true })
  const team = allTeams.find((item) => item.slug === slug)

  if (!team) {
    return NextResponse.json({ message: "Team not found" }, { status: 404 })
  }

  const teamProjects = projects
    .filter((project) => project.teamIds.includes(team.id))
    .map((project) => attachRelations(project, allTeams, templates, { includeTemplateStructure: false }))

  teamCache.clear()
  return NextResponse.json({ team, projects: teamProjects })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { teams } = await getStoreData({ bypassCache: true })
  const currentTeam = teams.find((item) => item.slug === slug)
  if (!currentTeam) {
    return NextResponse.json({ message: "Team not found" }, { status: 404 })
  }
  if (currentTeam.createdBy !== identity.userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const admin = createAdminClient()

  if (!admin) {
    return NextResponse.json({ message: "Supabase is not configured" }, { status: 500 })
  }

  const { error } = await admin.from("teams").delete().eq("slug", slug)

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  teamCache.clear()
  return NextResponse.json({ success: true })
}
