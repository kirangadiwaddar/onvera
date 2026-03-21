import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { attachRelations } from "@/lib/server/data-store"
import type { status } from "@/lib/project-status"
import {
  filterProjectsForIdentity,
  isAdminRole,
  isLeadForProject,
} from "@/lib/auth/access"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"
import { templateStructure } from "@/lib/template-structure"
import type { Section } from "@/lib/types"

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const resolveTemplateKeyFromTitle = (title?: string) => {
  if (!title) return undefined
  const normalizedTitle = slugify(title)
  if (!normalizedTitle) return undefined
  return Object.keys(templateStructure).find((key) => slugify(key) === normalizedTitle)
}

type ProjectRow = {
  id: number
  slug: string
  title: string
  template_id: string
  status: status
  created_at: string
  updated_at?: string | null
  avatar_src?: string | null
  team_ids?: number[] | null
  extra_members?: unknown[] | null
  submissions?: Record<string, unknown> | null
  created_by?: string | null
}

type TeamRow = {
  id: number
  name: string
  slug: string
  description: string
  status: "active" | "inactive"
  lead?: unknown | null
  members?: unknown[] | null
  created_at: string
  created_by?: string | null
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

type Member = {
  id: number
  name: string
  email?: string
}

function normalizeMember(member: unknown, fallbackId: number): Member | null {
  if (typeof member === "string") {
    const email = member.trim()
    if (!email) return null
    const name = email.split("@")[0] || "Member"
    return { id: fallbackId, name, email }
  }
  if (!member || typeof member !== "object") return null
  const raw = member as { id?: unknown; name?: unknown; email?: unknown }
  const email =
    typeof raw.email === "string" && raw.email.trim()
      ? raw.email.trim()
      : undefined
  const name =
    typeof raw.name === "string" && raw.name.trim()
      ? raw.name.trim()
      : email
        ? email.split("@")[0]
        : "Member"
  const id = typeof raw.id === "number" && Number.isFinite(raw.id) ? raw.id : fallbackId
  return email ? { id, name, email } : { id, name }
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

function normalizeProject(row: ProjectRow) {
  const extraMembers: Member[] = Array.isArray(row.extra_members)
    ? row.extra_members.reduce<Member[]>((acc, member, index) => {
        const normalized = normalizeMember(member, -1000 - index)
        if (normalized) acc.push(normalized)
        return acc
      }, [])
    : []

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    templateId: row.template_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
    avatarSrc: row.avatar_src ?? undefined,
    teamIds: row.team_ids ?? [],
    extraMembers,
    submissions: row.submissions ?? {},
    createdBy: row.created_by ?? null,
  }
}

function normalizeTeam(row: TeamRow) {
  const lead = normalizeMember(row.lead, -1) ?? undefined

  const members: Member[] = Array.isArray(row.members)
    ? row.members.reduce<Member[]>((acc, member, index) => {
        const normalized = normalizeMember(member, -2000 - index)
        if (normalized) acc.push(normalized)
        return acc
      }, [])
    : []

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    status: row.status,
    lead,
    members,
    createdAt: row.created_at,
    createdBy: row.created_by ?? null,
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

function hasIncompleteSections(submissions?: Record<string, unknown>) {
  if (!submissions || typeof submissions !== "object") return false
  return Object.entries(submissions).some(([key, raw]) => {
    if (!key.startsWith("__section_complete:")) return false
    return raw === false
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ message: "Supabase is not configured" }, { status: 500 })
  }

  const { data: projectRow } = await admin.from("projects").select("*").eq("slug", slug).maybeSingle()
  if (!projectRow) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 })
  }

  const teamIds = Array.isArray(projectRow.team_ids) ? projectRow.team_ids : []
  const [{ data: teamRows }, { data: templateRows }] = await Promise.all([
    teamIds.length > 0 ? admin.from("teams").select("*").in("id", teamIds) : Promise.resolve({ data: [] }),
    admin
      .from("templates")
      .select("*")
      .or(`id.eq.${projectRow.template_id},template_key.eq.${projectRow.template_id}`),
  ])

  const teams = (Array.isArray(teamRows) ? teamRows : []).map(normalizeTeam)
  const templates = Array.isArray(templateRows)
    ? (templateRows as TemplateRow[]).map(normalizeTemplate)
    : []
  const project = normalizeProject(projectRow as ProjectRow)

  const visibleProjects = filterProjectsForIdentity([project], teams, identity)
  if (visibleProjects.length === 0) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 })
  }

  let nextProject = project
  let tokenExpiresAt: string | null = null
  const { data } = await admin
    .from("onboarding_tokens")
    .select("expires_at")
    .eq("project_slug", slug)
    .order("created_at", { ascending: false })
    .limit(1)
  tokenExpiresAt = data?.[0]?.expires_at ?? null

  if (hasIncompleteSections(project.submissions) && project.status === "completed") {
    const { error } = await admin
      .from("projects")
      .update({ status: "ongoing", updated_at: new Date().toISOString() })
      .eq("slug", slug)
    if (!error) {
      nextProject = { ...project, status: "ongoing" }
    }
  } else if (shouldMarkOverdue(project, tokenExpiresAt)) {
    const { error } = await admin
      .from("projects")
      .update({ status: "overdue", updated_at: new Date().toISOString() })
      .eq("slug", slug)
    if (!error) {
      nextProject = { ...project, status: "overdue" }
    }
  } else if (shouldMarkOngoing(project)) {
    const { error } = await admin
      .from("projects")
      .update({ status: "ongoing", updated_at: new Date().toISOString() })
      .eq("slug", slug)
    if (!error) {
      nextProject = { ...project, status: "ongoing" }
    }
  }

  return NextResponse.json({ project: attachRelations(nextProject, teams, templates) })
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

  const body = (await request.json().catch(() => null)) as
    | {
        title?: string
        templateId?: string
        avatarSrc?: string
        status?: status
        teamIds?: number[]
        extraMembers?: unknown[]
        submissions?: Record<string, unknown>
      }
    | null

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid project payload" }, { status: 400 })
  }

  const admin = createAdminClient()

  if (!admin) {
    return NextResponse.json({ message: "Supabase is not configured" }, { status: 500 })
  }

  const { data: projectRow } = await admin.from("projects").select("*").eq("slug", slug).maybeSingle()
  if (!projectRow) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 })
  }

  const teamIds = Array.isArray(projectRow.team_ids) ? projectRow.team_ids : []
  const { data: teamRows } =
    teamIds.length > 0 ? await admin.from("teams").select("*").in("id", teamIds) : { data: [] }
  const teams = (Array.isArray(teamRows) ? teamRows : []).map(normalizeTeam)
  const currentProject = normalizeProject(projectRow as ProjectRow)

  const visibleProjects = filterProjectsForIdentity([currentProject], teams, identity)
  if (visibleProjects.length === 0) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const adminRole = isAdminRole(identity.role)
  const leadAccess = isLeadForProject(currentProject, teams, identity.email)
  const onlySubmissionsUpdate =
    Object.keys(body).length > 0 && Object.keys(body).every((key) => key === "submissions")
  const ownerAccess = currentProject.createdBy === identity.userId

  if (!ownerAccess && !adminRole && (!leadAccess || !onlySubmissionsUpdate)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const updatePayload: {
    title?: string
    template_id?: string
    avatar_src?: string
    status?: status
    team_ids?: number[]
    extra_members?: unknown[]
    submissions?: Record<string, unknown>
    updated_at: string
  } = {
    updated_at: new Date().toISOString(),
  }

  if (typeof body.title === "string" && body.title.trim()) {
    updatePayload.title = body.title.trim()
  }

  if (typeof body.templateId === "string" && body.templateId.trim()) {
    updatePayload.template_id = body.templateId
  }

  if (typeof body.avatarSrc === "string") {
    updatePayload.avatar_src = body.avatarSrc
  }

  if (typeof body.status === "string") {
    updatePayload.status = body.status
  }

  if (Array.isArray(body.teamIds)) {
    updatePayload.team_ids = body.teamIds
  }

  if (Array.isArray(body.extraMembers)) {
    updatePayload.extra_members = body.extraMembers
  }

  if (body.submissions && typeof body.submissions === "object" && !Array.isArray(body.submissions)) {
    updatePayload.submissions = body.submissions
    if (!body.status) {
      if (hasIncompleteSections(body.submissions)) {
        updatePayload.status = "ongoing"
      } else if (currentProject.status === "waiting" || currentProject.status === "overdue") {
        if (hasChecklistActivity(body.submissions)) {
          updatePayload.status = "ongoing"
        }
      }
    }
  }

  const updatableKeys = Object.keys(updatePayload).filter((key) => key !== "updated_at")

  if (updatableKeys.length === 0) {
    return NextResponse.json({ message: "No updates provided" }, { status: 400 })
  }

  const { error } = await admin.from("projects").update(updatePayload).eq("slug", slug)

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  const { data: updatedRow } = await admin.from("projects").select("*").eq("slug", slug).maybeSingle()
  if (!updatedRow) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 })
  }

  const updatedTeamIds = Array.isArray(updatedRow.team_ids) ? updatedRow.team_ids : []
  const [{ data: updatedTeamRows }, { data: templateRows }] = await Promise.all([
    updatedTeamIds.length > 0
      ? admin.from("teams").select("*").in("id", updatedTeamIds)
      : Promise.resolve({ data: [] }),
    admin
      .from("templates")
      .select("*")
      .or(`id.eq.${updatedRow.template_id},template_key.eq.${updatedRow.template_id}`),
  ])

  const updatedProject = normalizeProject(updatedRow as ProjectRow)
  const refreshedTeams = (Array.isArray(updatedTeamRows) ? updatedTeamRows : []).map(normalizeTeam)
  const templates = Array.isArray(templateRows)
    ? (templateRows as TemplateRow[]).map(normalizeTemplate)
    : []

  return NextResponse.json({ project: attachRelations(updatedProject, refreshedTeams, templates) })
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

  const admin = createAdminClient()

  if (!admin) {
    return NextResponse.json({ message: "Supabase is not configured" }, { status: 500 })
  }

  const { data: currentRow } = await admin.from("projects").select("slug, created_by").eq("slug", slug).maybeSingle()
  if (!currentRow) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 })
  }
  if (currentRow.created_by !== identity.userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const { error } = await admin.from("projects").delete().eq("slug", slug)

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
