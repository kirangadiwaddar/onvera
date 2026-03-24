import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { attachRelations } from "@/lib/server/data-store"
import { filterProjectsForIdentity } from "@/lib/auth/access"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"
import { templateStructure } from "@/lib/template-structure"
import type { status } from "@/lib/project-status"
import type { Section } from "@/lib/types"
import type { RequestIdentity } from "@/lib/auth/request-identity"

type ProjectsCacheEntry = {
  expiresAt: number
  payload: { projects: unknown[] }
}

const PROJECTS_CACHE_TTL_MS = 10_000
const projectsCache = new Map<string, ProjectsCacheEntry>()

function getCachedProjects(key: string) {
  const cached = projectsCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload
  }
  if (cached) {
    projectsCache.delete(key)
  }
  return null
}

function setCachedProjects(key: string, payload: ProjectsCacheEntry["payload"]) {
  projectsCache.set(key, { payload, expiresAt: Date.now() + PROJECTS_CACHE_TTL_MS })
}

const resolveTemplateKeyFromTitle = (title?: string) => {
  if (!title) return undefined
  const normalizedTitle = slugify(title)
  if (!normalizedTitle) return undefined
  return Object.keys(templateStructure).find((key) => slugify(key) === normalizedTitle)
}

function normalizeTemplateKey(template: Record<string, unknown>) {
  const rawKey =
    (template as { templateKey?: string }).templateKey ??
    (template as { template_key?: string }).template_key ??
    (template as { id?: string }).id ??
    ""
  const resolvedKey =
    templateStructure[rawKey] ||
    !(template as { title?: string }).title
      ? rawKey
      : resolveTemplateKeyFromTitle((template as { title?: string }).title) ?? rawKey
  const structure = Array.isArray((template as { structure?: unknown }).structure)
    ? ((template as { structure: unknown[] }).structure as Array<{ id?: string }>)
    : null
  const normalizedStructure = structure && structure.length > 0 && resolvedKey !== "branding"
    ? [
        {
          id: "branding",
          title: "Branding",
          items: [],
          dynamic: true,
        },
        ...structure.filter((section) => section?.id !== "branding"),
      ]
    : undefined
  return {
    ...template,
    templateKey: resolvedKey,
    ...(normalizedStructure ? { structure: normalizedStructure } : {}),
  }
}

type Template = {
  id: string
  title: string
  description: string
  icon: string
  badge: string
  structure?: Section[]
  templateKey?: string
  isDefault?: boolean
}

type TemplateRow = {
  id: string
  title: string
  description?: string | null
  icon?: string | null
  badge?: string | null
  structure?: Section[] | null
  template_key?: string | null
  is_default?: boolean | null
}

function normalizeTemplate(row: TemplateRow): Template {
  const normalized = normalizeTemplateKey(row as Record<string, unknown>) as Record<string, unknown>
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? "Untitled"),
    description: String(row.description ?? ""),
    icon: String(row.icon ?? "Globe"),
    badge: String(row.badge ?? "Custom"),
    structure: Array.isArray(normalized.structure) ? (normalized.structure as Section[]) : undefined,
    templateKey: typeof normalized.templateKey === "string" ? normalized.templateKey : undefined,
    isDefault: typeof row.is_default === "boolean" ? row.is_default : undefined,
  }
}
function hasChecklistActivity(submissions?: Record<string, unknown>) {
  if (!submissions || typeof submissions !== "object") return false

  return Object.entries(submissions).some(([key, raw]) => {
    if (key.startsWith("__section_complete:")) {
      return raw === true
    }
    if (Array.isArray(raw)) {
      return raw.some((row) => {
        if (!row || typeof row !== "object") return false
        const entry = row as { name?: unknown; url?: unknown; submittedAt?: unknown; status?: unknown }
        return Boolean(
          (typeof entry.name === "string" && entry.name.trim()) ||
          (typeof entry.url === "string" && entry.url.trim()) ||
          entry.submittedAt ||
          entry.status
        )
      })
    }
    if (!raw || typeof raw !== "object") return false
    const entry = raw as { value?: unknown; submittedAt?: unknown; status?: unknown }
    if (typeof entry.value === "string" && entry.value.trim()) return true
    if (entry.value !== undefined && entry.value !== null) return true
    return Boolean(entry.submittedAt || entry.status)
  })
}

function shouldMarkOngoing(
  project: { status: status; submissions?: Record<string, unknown> },
) {
  if (project.status !== "waiting" && project.status !== "overdue") return false
  return hasChecklistActivity(project.submissions)
}

function shouldMarkOverdue(
  project: { status: status; submissions?: Record<string, unknown> },
  tokenExpiresAt?: string | null,
) {
  if (project.status !== "waiting") return false
  if (hasChecklistActivity(project.submissions)) return false
  if (!tokenExpiresAt) return false
  const expiresAt = new Date(tokenExpiresAt).getTime()
  if (!Number.isFinite(expiresAt)) return false
  return Date.now() > expiresAt
}

function hasIncompleteSections(submissions?: Record<string, unknown>) {
  if (!submissions || typeof submissions !== "object") return false
  return Object.entries(submissions).some(([key, raw]) => {
    if (!key.startsWith("__section_complete:")) return false
    return raw === false
  })
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

type Project = {
  id: number
  slug: string
  title: string
  status: status
  templateId: string
  createdAt: string
  updatedAt?: string
  avatarSrc?: string
  teamIds: number[]
  extraMembers?: Member[]
  submissions?: Record<string, unknown>
  createdBy?: string | null
}

type Team = {
  id: number
  name: string
  slug: string
  description: string
  status: "active" | "inactive"
  lead?: Member
  members: Member[]
  createdAt: string
  createdBy?: string | null
}

type AccessTeam = {
  id: number
  lead?: { email?: string }
  members?: Array<{ email?: string }>
  createdBy?: string | null
}

function withStatus(project: Project, nextStatus: status): Project {
  return { ...project, status: nextStatus }
}

type SummaryTeamRow = {
  id: number
  lead?: { email?: string | null } | null
  members?: Array<{ email?: string | null }> | null
  created_by?: string | null
}

type SummaryProjectRow = {
  id: number
  slug: string
  title: string
  status: status
  created_at: string
  updated_at?: string | null
  team_ids?: number[] | null
  extra_members?: Array<{ email?: string | null }> | null
  created_by?: string | null
}

type Member = {
  id: number
  name: string
  role?: string
  image?: string
  email?: string
  accessToken?: string
  memberType?: "agency" | "freelancer"
  isLead?: boolean
  isExternal?: boolean
}

type ProjectRow = {
  id: number
  slug: string
  title: string
  status: status
  template_id: string
  created_at: string
  updated_at?: string | null
  avatar_src?: string | null
  team_ids?: number[] | null
  extra_members?: Array<{ email?: string | null }> | null
  submissions?: Record<string, unknown> | null
  created_by?: string | null
}

type TeamRow = {
  id: number
  name: string
  slug: string
  description?: string | null
  status: "active" | "inactive"
  lead?: { email?: string | null } | null
  members?: Array<{ email?: string | null }> | null
  created_at: string
  created_by?: string | null
}

const normalizeEmail = (value?: string | null) => (value || "").trim().toLowerCase()

const isTeamMemberInTeam = (team: SummaryTeamRow, email?: string | null) => {
  const target = normalizeEmail(email)
  if (!target) return false
  const leadEmail = normalizeEmail(team.lead?.email ?? null)
  if (leadEmail && leadEmail === target) return true
  return (team.members || []).some((member) => normalizeEmail(member.email ?? null) === target)
}

async function getSummaryProjects(identity: RequestIdentity) {
  const admin = createAdminClient()
  if (!admin) return [] as Array<{
    id: number
    slug: string
    title: string
    status: status
    createdAt: string
    updatedAt?: string
    teamIds: number[]
  }>

  const [{ data: teamRows, error: teamsError }, { data: projectRows, error: projectsError }] =
    await Promise.all([
      admin.from("teams").select("id,lead,members,created_by"),
      admin
        .from("projects")
        .select("id,slug,title,status,created_at,updated_at,team_ids,extra_members,created_by"),
    ])

  if (teamsError || projectsError || !teamRows || !projectRows) {
    console.error("Supabase summary fetch failed:", {
      teamsError: teamsError?.message ?? null,
      projectsError: projectsError?.message ?? null,
    })
    return []
  }

  type SummaryTeam = {
    id: number
    lead?: { email?: string }
    members?: Array<{ email?: string }>
    createdBy?: string | null
  }

  type SummaryProject = {
    id: number
    slug: string
    title: string
    status: status
    createdAt: string
    updatedAt?: string
    teamIds: number[]
    extraMembers?: Array<{ email?: string }>
    createdBy?: string | null
  }

  const teams: SummaryTeam[] = (teamRows as SummaryTeamRow[]).map((row) => ({
    id: row.id,
    lead: row.lead ? { email: row.lead.email ?? undefined } : undefined,
    members: Array.isArray(row.members)
      ? row.members.map((member) => ({ email: member?.email ?? undefined }))
      : [],
    createdBy: row.created_by ?? null,
  }))

  const projects: SummaryProject[] = (projectRows as SummaryProjectRow[]).map((row) => ({
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
        }))
      : [],
    createdBy: row.created_by ?? null,
  }))

  const visibleProjects = filterProjectsForIdentity<SummaryProject, SummaryTeam>(projects, teams, identity)
  return visibleProjects.map((project) => ({
    id: project.id,
    slug: project.slug,
    title: project.title,
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    teamIds: project.teamIds,
  }))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const summary = searchParams.get("summary") === "1"
  const bypassCache = searchParams.get("cache") === "0"
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const cacheKey = `projects:${summary ? "summary" : "full"}:${identity.userId}:${identity.role ?? ""}:${identity.email ?? ""}`
  if (!bypassCache) {
    const cached = getCachedProjects(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }
  }
  if (summary) {
    const projects = await getSummaryProjects(identity)
    const payload = { projects }
    if (!bypassCache) {
      setCachedProjects(cacheKey, payload)
    }
    return NextResponse.json(payload)
  }
  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ projects: [] })
  }

  const { data: accessTeams, error: accessTeamsError } = await admin
    .from("teams")
    .select("id,lead,members,created_by")

  if (accessTeamsError || !accessTeams) {
    console.error("Supabase team access fetch failed:", accessTeamsError?.message ?? null)
    return NextResponse.json({ projects: [] })
  }

  const accessTeamRows = accessTeams as SummaryTeamRow[]
  const memberTeamIds = accessTeamRows
    .filter((team) => isTeamMemberInTeam(team, identity.email ?? null))
    .map((team) => team.id)

  const ownedProjectsRequest = admin
    .from("projects")
    .select("id,slug,title,status,template_id,created_at,updated_at,avatar_src,team_ids,extra_members,created_by")
    .eq("created_by", identity.userId)

  const teamProjectsRequest = memberTeamIds.length > 0
    ? admin
        .from("projects")
        .select("id,slug,title,status,template_id,created_at,updated_at,avatar_src,team_ids,extra_members,created_by")
        .overlaps("team_ids", memberTeamIds)
    : Promise.resolve({ data: [], error: null })

  const emailFilter = identity.email ? [{ email: identity.email.toLowerCase() }] : []
  const extraMemberRequest = emailFilter.length > 0
    ? admin
        .from("projects")
        .select("id,slug,title,status,template_id,created_at,updated_at,avatar_src,team_ids,extra_members,created_by")
        .contains("extra_members", emailFilter)
    : Promise.resolve({ data: [], error: null })

  const [
    { data: ownedProjects, error: ownedError },
    { data: teamProjects, error: teamError },
    { data: extraMemberProjects, error: extraMemberError },
  ] = await Promise.all([ownedProjectsRequest, teamProjectsRequest, extraMemberRequest])

  let projectRows: ProjectRow[] = []
  const hadExtraMemberError = Boolean(extraMemberError)

  if (ownedError || teamError || hadExtraMemberError) {
    if (ownedError || teamError) {
      console.error("Supabase project access fetch failed:", {
        ownedError: ownedError?.message ?? null,
        teamError: teamError?.message ?? null,
        extraMemberError: extraMemberError?.message ?? null,
      })
    }

    const { data: fallbackProjects, error: fallbackError } = await admin
      .from("projects")
      .select("id,slug,title,status,template_id,created_at,updated_at,avatar_src,team_ids,extra_members,created_by")

    if (fallbackError || !fallbackProjects) {
      console.error("Supabase project fallback fetch failed:", fallbackError?.message ?? null)
      return NextResponse.json({ projects: [] })
    }
    projectRows = fallbackProjects as ProjectRow[]
  } else {
    const merged = new Map<number, ProjectRow>()
    ;(ownedProjects as ProjectRow[] | null | undefined)?.forEach((row) => merged.set(row.id, row))
    ;(teamProjects as ProjectRow[] | null | undefined)?.forEach((row) => merged.set(row.id, row))
    ;(extraMemberProjects as ProjectRow[] | null | undefined)?.forEach((row) => merged.set(row.id, row))
    projectRows = Array.from(merged.values())
  }

  const accessTeamsNormalized: AccessTeam[] = accessTeamRows.map((row) => ({
    id: row.id,
    lead: row.lead ? { email: row.lead.email ?? undefined } : undefined,
    members: Array.isArray(row.members)
      ? row.members.map((member) => ({ email: member?.email ?? undefined }))
      : [],
    createdBy: row.created_by ?? null,
  }))

  const projectsNormalized: Project[] = projectRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    templateId: row.template_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
    avatarSrc: row.avatar_src ?? undefined,
    teamIds: row.team_ids ?? [],
    extraMembers: Array.isArray(row.extra_members)
      ? row.extra_members
        .filter(Boolean)
        .map((member) => ({
          ...(member as Member),
          email: (member as { email?: string | null }).email ?? undefined,
        }))
      : [],
    submissions: {},
    createdBy: row.created_by ?? null,
  }))

  const visibleProjects = filterProjectsForIdentity<Project, AccessTeam>(
    projectsNormalized,
    accessTeamsNormalized,
    identity,
  )

  const tokenExpiryBySlug = new Map<string, string | null>()
  if (visibleProjects.length > 0) {
    const slugs = visibleProjects.map((project) => project.slug)
    const { data } = await admin
      .from("onboarding_tokens")
      .select("project_slug, expires_at, created_at")
      .in("project_slug", slugs)
      .order("created_at", { ascending: false })

    if (Array.isArray(data)) {
      data.forEach((row) => {
        if (!tokenExpiryBySlug.has(row.project_slug)) {
          tokenExpiryBySlug.set(row.project_slug, row.expires_at ?? null)
        }
      })
    }
  }

  const statusSensitiveSlugs = visibleProjects
    .filter((project) => project.status === "waiting" || project.status === "overdue" || project.status === "completed")
    .map((project) => project.slug)

  const submissionsBySlug = new Map<string, Record<string, unknown>>()
  if (statusSensitiveSlugs.length > 0) {
    const { data: submissionRows, error: submissionError } = await admin
      .from("projects")
      .select("slug, submissions")
      .in("slug", statusSensitiveSlugs)

    if (submissionError) {
      console.error("Supabase submissions fetch failed:", submissionError.message)
    } else if (Array.isArray(submissionRows)) {
      submissionRows.forEach((row) => {
        submissionsBySlug.set(row.slug, (row.submissions as Record<string, unknown>) ?? {})
      })
    }
  }

  const overdueUpdates = visibleProjects.filter((project) =>
    shouldMarkOverdue(
      { ...project, submissions: submissionsBySlug.get(project.slug) ?? project.submissions },
      tokenExpiryBySlug.get(project.slug),
    ),
  )
  if (overdueUpdates.length > 0 && admin) {
    await Promise.all(
      overdueUpdates.map((project) =>
        admin
          .from("projects")
          .update({ status: "overdue", updated_at: new Date().toISOString() })
          .eq("slug", project.slug),
      ),
    )
  }

  const ongoingUpdates = visibleProjects.filter(
    (project) =>
      !shouldMarkOverdue(
        { ...project, submissions: submissionsBySlug.get(project.slug) ?? project.submissions },
        tokenExpiryBySlug.get(project.slug),
      ) &&
      shouldMarkOngoing({ ...project, submissions: submissionsBySlug.get(project.slug) ?? project.submissions }),
  )
  if (ongoingUpdates.length > 0 && admin) {
    await Promise.all(
      ongoingUpdates.map((project) =>
        admin
          .from("projects")
          .update({ status: "ongoing", updated_at: new Date().toISOString() })
          .eq("slug", project.slug),
      ),
    )
  }

  const normalizedProjects: Project[] = visibleProjects.map((project) => {
    const submissions = submissionsBySlug.get(project.slug) ?? project.submissions
    if (project.status === "completed" && hasIncompleteSections(submissions)) {
      return withStatus(project, "ongoing")
    }
    if (shouldMarkOverdue({ ...project, submissions }, tokenExpiryBySlug.get(project.slug))) {
      return withStatus(project, "overdue")
    }
    if (shouldMarkOngoing({ ...project, submissions })) {
      return withStatus(project, "ongoing")
    }
    return { ...project, submissions }
  })

  const teamIds = Array.from(
    new Set(normalizedProjects.flatMap((project) => project.teamIds ?? [])),
  )

  const { data: teamRows, error: teamRowsError } = teamIds.length
    ? await admin
        .from("teams")
        .select("id,name,slug,description,status,lead,members,created_at,created_by")
        .in("id", teamIds)
    : { data: [], error: null }

  if (teamRowsError) {
    console.error("Supabase teams fetch failed:", teamRowsError.message)
  }

  const templateIds = Array.from(new Set(normalizedProjects.map((project) => project.templateId).filter(Boolean)))

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
    console.error("Supabase templates fetch failed:", {
      byId: templatesById.error?.message ?? null,
      byKey: templatesByKey.error?.message ?? null,
    })
  }

  const templateMap = new Map<string, TemplateRow>()
  ;(templatesById.data || []).forEach((row) => templateMap.set(String((row as TemplateRow).id), row as TemplateRow))
  ;(templatesByKey.data || []).forEach((row) => {
    const key = (row as TemplateRow).template_key ?? (row as TemplateRow).id
    templateMap.set(String(key), row as TemplateRow)
  })

  const templates = Array.from(templateMap.values()).map((row) => ({
    id: String(row.id ?? ""),
    title: String(row.title ?? "Untitled"),
    description: "",
    icon: String(row.icon ?? "Globe"),
    badge: String(row.badge ?? "Custom"),
    templateKey: row.template_key ?? row.id,
    isDefault: typeof row.is_default === "boolean" ? row.is_default : undefined,
  }))

  const teams: Team[] = Array.isArray(teamRows)
    ? (teamRows as TeamRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description ?? "",
        status: row.status,
        lead: row.lead
          ? {
              ...(row.lead as Member),
              email: row.lead.email ?? undefined,
            }
          : undefined,
        members: Array.isArray(row.members)
          ? row.members
            .filter(Boolean)
            .map((member) => ({
              ...(member as Member),
              email: (member as { email?: string | null }).email ?? undefined,
            }))
          : [],
        createdAt: row.created_at,
        createdBy: row.created_by ?? null,
      }))
    : []

  const payload = {
    projects: normalizedProjects.map((project) =>
      attachRelations(project, teams, templates, { includeTemplateStructure: false }),
    ),
  }
  if (!bypassCache) {
    setCachedProjects(cacheKey, payload)
  }
  return NextResponse.json(payload)
}

export async function POST(request: Request) {
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as
    | {
        title?: string
        slug?: string
        templateId?: string
        status?: string
        createdAt?: string
        updatedAt?: string
        avatarSrc?: string
        teamIds?: number[]
        extraMembers?: unknown[]
        submissions?: Record<string, unknown>
      }
    | null

  if (!body?.title || !body.templateId) {
    return NextResponse.json({ message: "Invalid project payload" }, { status: 400 })
  }

  const admin = createAdminClient()

  if (!admin) {
    return NextResponse.json({ message: "Supabase is not configured" }, { status: 500 })
  }

  const baseSlug = slugify(body.slug || body.title)

  if (!baseSlug) {
    return NextResponse.json({ message: "Invalid project title" }, { status: 400 })
  }

  const existingSlugs = new Set<string>()
  const { data: slugRows } = await admin
    .from("projects")
    .select("slug")
    .ilike("slug", `${baseSlug}%`)
  if (Array.isArray(slugRows)) {
    slugRows.forEach((row) => {
      if (row?.slug) existingSlugs.add(row.slug)
    })
  }
  let slug = baseSlug
  let suffix = 1

  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }

  const insertPayload = {
    slug,
    title: body.title,
    template_id: body.templateId,
    created_by: identity.userId,
    status: body.status ?? "waiting",
    created_at: body.createdAt ?? new Date().toISOString(),
    updated_at: body.updatedAt ?? new Date().toISOString(),
    avatar_src: body.avatarSrc ?? "",
    team_ids: body.teamIds ?? [],
    extra_members: body.extraMembers ?? [],
    submissions: body.submissions ?? {},
  }

  const { error } = await admin.from("projects").insert(insertPayload)

  if (error) {
    if (error.message?.includes("created_by")) {
      return NextResponse.json(
        {
          message:
            "Database schema is missing projects.created_by. Run migration 20260309_owner_scope_projects_teams.sql.",
        },
        { status: 500 },
      )
    }
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  projectsCache.clear()
  const { data: createdRow } = await admin
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .maybeSingle()

  if (!createdRow) {
    return NextResponse.json({ message: "Project created but could not be fetched" }, { status: 201 })
  }

  const teamIds = Array.isArray(createdRow.team_ids) ? createdRow.team_ids : []
  const [{ data: teams }, { data: templates }] = await Promise.all([
    teamIds.length > 0
      ? admin.from("teams").select("*").in("id", teamIds)
      : Promise.resolve({ data: [] }),
    admin
      .from("templates")
      .select("*")
      .or(`id.eq.${createdRow.template_id},template_key.eq.${createdRow.template_id}`),
  ])

  const project = {
    id: createdRow.id,
    slug: createdRow.slug,
    title: createdRow.title,
    templateId: createdRow.template_id,
    status: createdRow.status,
    createdAt: createdRow.created_at,
    updatedAt: createdRow.updated_at ?? undefined,
    avatarSrc: createdRow.avatar_src ?? undefined,
    teamIds: createdRow.team_ids ?? [],
    extraMembers: createdRow.extra_members ?? [],
    submissions: createdRow.submissions ?? {},
    createdBy: createdRow.created_by ?? null,
  }

  const normalizedTemplates = Array.isArray(templates)
    ? (templates as TemplateRow[]).map(normalizeTemplate)
    : []

  return NextResponse.json(
    attachRelations(project, Array.isArray(teams) ? teams : [], normalizedTemplates),
    { status: 201 },
  )
}
