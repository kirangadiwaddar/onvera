import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { attachRelations, getStoreData } from "@/lib/server/data-store"
import { filterProjectsForIdentity } from "@/lib/auth/access"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"
import { templateStructure } from "@/lib/template-structure"
import type { status } from "@/lib/project-status"
import type { Section } from "@/lib/types"
import type { RequestIdentity } from "@/lib/auth/request-identity"
import { getPlanLimits } from "@/lib/billing/plans"
import { getAccessibleProjectRows, getTeamAccessScope } from "@/lib/server/project-access"

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

function withStatus(project: Project, nextStatus: status): Project {
  return { ...project, status: nextStatus }
}

type Member = {
  id: number
  name: string
  role?: string
  image?: string
  email?: string
  accessToken?: string
  memberType?: "team_lead"
  isLead?: boolean
  isExternal?: boolean
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

function sortByNewestCreatedAt<T extends { createdAt?: string; created_at?: string | null }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aDate = new Date(a.createdAt ?? a.created_at ?? 0).getTime()
    const bDate = new Date(b.createdAt ?? b.created_at ?? 0).getTime()
    return bDate - aDate
  })
}

async function getUserDirectory(
  admin: ReturnType<typeof createAdminClient>,
  userIds: Array<string | null | undefined>,
) {
  const ids = Array.from(new Set(userIds.filter((id): id is string => Boolean(id))))
  const nameById = new Map<string, string>()
  const emailById = new Map<string, string>()
  if (!admin || ids.length === 0) return { nameById, emailById }

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", ids)

  if (Array.isArray(profiles)) {
    profiles.forEach((profile) => {
      if (profile?.id) {
        nameById.set(profile.id, profile.full_name ?? "")
      }
    })
  }

  const getUserById = (admin.auth.admin as unknown as {
    getUserById?: (id: string) => Promise<{
      data?: { user?: { id?: string; email?: string | null } | null }
      error?: { message?: string } | null
    }>
  }).getUserById

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
      if (user?.id && user.email) {
        emailById.set(user.id, user.email)
      }
    })
  } else {
    let page = 1
    const perPage = 1000
    const unresolved = new Set(ids)
    while (unresolved.size > 0) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
      if (error) {
        console.error("Supabase listUsers failed:", error.message)
        break
      }
      const users = Array.isArray((data as { users?: unknown })?.users)
        ? (data as { users: Array<{ id?: string; email?: string | null }> }).users
        : Array.isArray(data)
          ? (data as Array<{ id?: string; email?: string | null }>)
          : []
      users.forEach((user) => {
        const id = user?.id
        const email = user?.email
        if (id && email && unresolved.has(id)) {
          unresolved.delete(id)
          emailById.set(id, email)
        }
      })
      const nextPage = (data as { nextPage?: number | null } | null)?.nextPage
      if (!nextPage) break
      page = nextPage
    }
  }

  return { nameById, emailById }
}

async function getSummaryProjects(identity: RequestIdentity, limit?: number) {
  const admin = createAdminClient()
  if (!admin) return []

  const { memberTeamIds } = await getTeamAccessScope(admin, {
    userId: identity.userId,
    email: identity.email,
  })

  const rows = await getAccessibleProjectRows<{
    id: number
    slug: string
    title: string
    status: status
    created_at: string
    updated_at?: string | null
    team_ids?: number[] | null
    created_by?: string | null
  }>(
    admin,
    { userId: identity.userId, email: identity.email },
    "id,slug,title,status,created_at,updated_at,team_ids,created_by",
    memberTeamIds,
  )

  const normalized = sortByNewestCreatedAt(rows).map((project) => ({
    id: project.id,
    slug: project.slug,
    title: project.title,
    status: project.status,
    createdAt: project.created_at,
    updatedAt: project.updated_at ?? undefined,
    teamIds: project.team_ids ?? [],
    createdBy: project.created_by ?? null,
  }))

  return typeof limit === "number" ? normalized.slice(0, limit) : normalized
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const summary = searchParams.get("summary") === "1"
  const bypassCache = searchParams.get("cache") === "0"
  const limitRaw = Number(searchParams.get("limit") ?? "")
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 1000) : undefined
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const workspaceId = request.headers.get("x-workspace-id")?.trim() || "-"
  const cacheKey = `projects:${summary ? "summary" : "full"}:${limit ?? "all"}:${identity.userId}:${identity.role ?? ""}:${identity.email ?? ""}:${workspaceId}`
  if (!bypassCache) {
    const cached = getCachedProjects(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }
  }
  if (summary) {
    const projects = await getSummaryProjects(identity, limit)
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
  const { projects, teams, templates } = await getStoreData({
    includeTemplateStructure: false,
    includeProjectSubmissions: false,
  })
  const visibleProjects = filterProjectsForIdentity(projects, teams, identity)

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

  const { nameById, emailById } = await getUserDirectory(
    admin,
    normalizedProjects.map((project) => project.createdBy),
  )
  const projectsWithOwners: Project[] = normalizedProjects.map((project) => {
    const ownerId = project.createdBy || ""
    return {
      ...project,
      ownerName: nameById.get(ownerId) || null,
      ownerEmail: emailById.get(ownerId) || null,
    }
  })

  const payload = {
    projects: sortByNewestCreatedAt(projectsWithOwners).map((project) =>
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

  const planLimits = getPlanLimits(identity.plan)
  if (planLimits.maxProjects !== null) {
    const { count } = await admin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("created_by", identity.userId)
    if ((count ?? 0) >= planLimits.maxProjects) {
      return NextResponse.json(
        { message: "Project limit reached for your current plan." },
        { status: 403 },
      )
    }
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

  if (!planLimits.defaultTemplates) {
    const { data: templateRow } = await admin
      .from("templates")
      .select("id, is_default, created_by, template_key")
      .or(`id.eq.${body.templateId},template_key.eq.${body.templateId}`)
      .maybeSingle()
    const isDefaultTemplate =
      templateRow &&
      (templateRow as { is_default?: boolean | null }).is_default === true &&
      !(templateRow as { created_by?: string | null }).created_by
    if (isDefaultTemplate) {
      return NextResponse.json(
        { message: "Default templates are not available on your current plan." },
        { status: 403 },
      )
    }
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
    .select("id,slug,title,template_id,status,created_at,updated_at,avatar_src,team_ids,extra_members,submissions,created_by")
    .eq("slug", slug)
    .maybeSingle()

  if (!createdRow) {
    return NextResponse.json({ message: "Project created but could not be fetched" }, { status: 201 })
  }

  const teamIds = Array.isArray(createdRow.team_ids) ? createdRow.team_ids : []
  const [{ data: teams }, { data: templates }] = await Promise.all([
    teamIds.length > 0
      ? admin.from("teams").select("id,name,slug,description,status,lead,members,created_at,created_by").in("id", teamIds)
      : Promise.resolve({ data: [] }),
    admin
      .from("templates")
      .select("id,title,description,icon,badge,structure,template_key,is_default")
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
  const normalizedTeams = Array.isArray(teams)
    ? (teams as TeamRow[]).map((row) => ({
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

  return NextResponse.json(
    attachRelations(project, normalizedTeams, normalizedTemplates),
    { status: 201 },
  )
}
