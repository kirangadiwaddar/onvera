import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { attachRelations, getStoreData } from "@/lib/server/data-store"
import { filterProjectsForIdentity } from "@/lib/auth/access"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"
import { templateStructure } from "@/lib/template-structure"
import type { status } from "@/lib/project-status"
import type { StoreData } from "@/lib/server/data-store"
import type { Section } from "@/lib/types"

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

type Template = StoreData["templates"][number]

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

type Project = StoreData["projects"][number]
type Team = StoreData["teams"][number]

function withStatus(project: Project, nextStatus: status): Project {
  return { ...project, status: nextStatus }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const summary = searchParams.get("summary") === "1"
  const { projects, teams, templates } = await getStoreData()
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const visibleProjects = filterProjectsForIdentity<Project, Team>(projects, teams, identity)
  const admin = createAdminClient()
  const tokenExpiryBySlug = new Map<string, string | null>()
  if (admin && visibleProjects.length > 0) {
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

  const overdueUpdates = visibleProjects.filter((project) =>
    shouldMarkOverdue(project, tokenExpiryBySlug.get(project.slug)),
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
      !shouldMarkOverdue(project, tokenExpiryBySlug.get(project.slug)) &&
      shouldMarkOngoing(project),
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
    if (project.status === "completed" && hasIncompleteSections(project.submissions)) {
      return withStatus(project, "ongoing")
    }
    if (shouldMarkOverdue(project, tokenExpiryBySlug.get(project.slug))) {
      return withStatus(project, "overdue")
    }
    if (shouldMarkOngoing(project)) {
      return withStatus(project, "ongoing")
    }
    return project
  })

  if (summary) {
    return NextResponse.json({
      projects: normalizedProjects.map((project) => ({
        id: project.id,
        slug: project.slug,
        title: project.title,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        teamIds: project.teamIds,
      })),
    })
  }

  return NextResponse.json({
    projects: normalizedProjects.map((project) =>
      attachRelations(project, teams, templates, { includeTemplateStructure: false }),
    ),
  })
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
