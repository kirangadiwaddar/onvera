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
import { getPlanForUserId } from "@/lib/billing/server"
import { getPlanLimits } from "@/lib/billing/plans"
import { createProjectActivityNotifications, findUserEmailById } from "@/lib/server/notifications"

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

async function getOwnerInfo(
  admin: ReturnType<typeof createAdminClient>,
  ownerId?: string | null,
) {
  if (!admin || !ownerId) return { ownerName: null, ownerEmail: null }
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", ownerId)
    .maybeSingle()
  const ownerName = profile?.full_name ?? null
  const ownerEmail = await findUserEmailById(admin, ownerId)
  return { ownerName, ownerEmail }
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
  role?: string
  image?: string
  accessToken?: string
  memberType?: "team_lead"
  isLead?: boolean
  isExternal?: boolean
  isRegistered?: boolean
}

type SupabaseUser = {
  email?: string | null
}

async function getRegisteredEmailSet(
  admin: ReturnType<typeof createAdminClient>,
  candidateEmails: Set<string>,
) {
  if (!admin || candidateEmails.size === 0) return new Set<string>()
  const registered = new Set<string>()
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error("Supabase listUsers failed:", error.message)
      break
    }

    const users = Array.isArray((data as { users?: unknown })?.users)
      ? (data as { users: SupabaseUser[] }).users
      : Array.isArray(data)
        ? (data as SupabaseUser[])
        : []

    users.forEach((user) => {
      const email = user.email?.toLowerCase()
      if (email && candidateEmails.has(email)) {
        registered.add(email)
      }
    })

    const nextPage = (data as { nextPage?: number | null } | null)?.nextPage
    if (!nextPage) break
    page = nextPage
  }

  return registered
}

function applyRegisteredFlag(member: Member, registeredEmails: Set<string>) {
  const email = member.email?.toLowerCase()
  return {
    ...member,
    ...(email ? { isRegistered: registeredEmails.has(email) } : {}),
  }
}

function normalizeMember(member: unknown, fallbackId: number): Member | null {
  if (typeof member === "string") {
    const email = member.trim()
    if (!email) return null
    const name = email.split("@")[0] || "Member"
    return { id: fallbackId, name, email }
  }
  if (!member || typeof member !== "object") return null
  const raw = member as {
    id?: unknown
    name?: unknown
    email?: unknown
    role?: unknown
    image?: unknown
    accessToken?: unknown
    memberType?: unknown
    isLead?: unknown
    isExternal?: unknown
  }
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
  const role =
    typeof raw.role === "string" && raw.role.trim() ? raw.role.trim() : undefined
  const image =
    typeof raw.image === "string" && raw.image.trim() ? raw.image.trim() : undefined
  const accessToken =
    typeof raw.accessToken === "string" && raw.accessToken.trim()
      ? raw.accessToken.trim()
      : undefined
  const memberType: Member["memberType"] =
    raw.memberType === "team_lead" || raw.memberType === "agency" || raw.memberType === "freelancer"
      ? "team_lead"
      : undefined
  const isLead = typeof raw.isLead === "boolean" ? raw.isLead : undefined
  const isExternal = typeof raw.isExternal === "boolean" ? raw.isExternal : undefined
  const base: Member = {
    id,
    name,
    ...(email ? { email } : {}),
    ...(role ? { role } : {}),
    ...(image ? { image } : {}),
    ...(accessToken ? { accessToken } : {}),
    ...(memberType ? { memberType } : {}),
    ...(isLead !== undefined ? { isLead } : {}),
    ...(isExternal !== undefined ? { isExternal } : {}),
  }
  return base
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

async function isProjectLockedForOwner(
  admin: ReturnType<typeof createAdminClient>,
  ownerId: string | null | undefined,
  projectId: number,
  maxProjects: number | null,
) {
  if (!admin || !ownerId || maxProjects === null) return false
  const { data: rows } = await admin
    .from("projects")
    .select("id, created_at")
    .eq("created_by", ownerId)
    .order("created_at", { ascending: false })
  const projects = Array.isArray(rows) ? rows : []
  const index = projects.findIndex((row) => row.id === projectId)
  return index >= 0 && index >= maxProjects
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

function countChecklistEntries(submissions?: Record<string, unknown>) {
  if (!submissions || typeof submissions !== "object") return 0
  let count = 0

  Object.entries(submissions).forEach(([key, raw]) => {
    if (key.startsWith("__")) return

    if (Array.isArray(raw)) {
      raw.forEach((row) => {
        if (!row || typeof row !== "object") return
        const entry = row as { name?: unknown; url?: unknown; value?: unknown }
        const hasName = typeof entry.name === "string" && entry.name.trim().length > 0
        const hasUrl = typeof entry.url === "string" && entry.url.trim().length > 0
        const hasValue = typeof entry.value === "string" && entry.value.trim().length > 0
        if (hasName || hasUrl || hasValue) count += 1
      })
      return
    }

    if (!raw || typeof raw !== "object") return
    const entry = raw as { value?: unknown }
    if (typeof entry.value === "string" && entry.value.trim().length > 0) {
      count += 1
    }
  })

  return count
}

function getNewlyCompletedSectionIds(
  beforeSubmissions?: Record<string, unknown>,
  afterSubmissions?: Record<string, unknown>,
) {
  if (!afterSubmissions || typeof afterSubmissions !== "object") return []
  const before = beforeSubmissions && typeof beforeSubmissions === "object" ? beforeSubmissions : {}
  const completed: string[] = []

  Object.entries(afterSubmissions).forEach(([key, raw]) => {
    if (!key.startsWith("__section_complete:")) return
    if (raw !== true) return
    const wasCompleted = (before as Record<string, unknown>)[key] === true
    if (wasCompleted) return
    const sectionId = key.replace("__section_complete:", "").trim()
    completed.push(sectionId || key)
  })

  return completed
}

function stripSubmissionNotificationMeta(submissions?: Record<string, unknown>) {
  if (!submissions || typeof submissions !== "object") return {}
  return Object.fromEntries(
    Object.entries(submissions).filter(([key]) => key !== "__last_client_update"),
  )
}

function hasMeaningfulSubmissionChange(
  beforeSubmissions?: Record<string, unknown>,
  afterSubmissions?: Record<string, unknown>,
) {
  return JSON.stringify(stripSubmissionNotificationMeta(beforeSubmissions)) !==
    JSON.stringify(stripSubmissionNotificationMeta(afterSubmissions))
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

const PROJECT_DETAIL_SELECT =
  "id,slug,title,template_id,status,created_at,updated_at,avatar_src,team_ids,extra_members,submissions,created_by"
const TEAM_DETAIL_SELECT =
  "id,name,slug,description,status,lead,members,created_at,created_by"
const TEMPLATE_DETAIL_SELECT =
  "id,title,description,icon,badge,structure,template_key,is_default"

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

  const { data: projectRow } = await admin.from("projects").select(PROJECT_DETAIL_SELECT).eq("slug", slug).maybeSingle()
  if (!projectRow) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 })
  }

  const teamIds = Array.isArray(projectRow.team_ids) ? projectRow.team_ids : []
  const [{ data: teamRows }, { data: templateRows }] = await Promise.all([
    teamIds.length > 0 ? admin.from("teams").select(TEAM_DETAIL_SELECT).in("id", teamIds) : Promise.resolve({ data: [] }),
    admin
      .from("templates")
      .select(TEMPLATE_DETAIL_SELECT)
      .or(`id.eq.${projectRow.template_id},template_key.eq.${projectRow.template_id}`),
  ])

  const teams = (Array.isArray(teamRows) ? teamRows : []).map(normalizeTeam)
  const templates = Array.isArray(templateRows)
    ? (templateRows as TemplateRow[]).map(normalizeTemplate)
    : []
  const ownerPlan = await getPlanForUserId(admin, projectRow.created_by ?? null)
  const planLimits = getPlanLimits(ownerPlan)
  const isLocked = await isProjectLockedForOwner(
    admin,
    projectRow.created_by ?? null,
    projectRow.id,
    planLimits.maxProjects,
  )
  const ownerInfo = await getOwnerInfo(admin, projectRow.created_by ?? null)
  const project = {
    ...normalizeProject(projectRow as ProjectRow),
    plan: ownerPlan,
    isLocked,
    ownerName: ownerInfo.ownerName,
    ownerEmail: ownerInfo.ownerEmail,
  }

  const candidateEmails = new Set<string>()
  teams.forEach((team) => {
    if (team.lead?.email) candidateEmails.add(team.lead.email.toLowerCase())
    team.members.forEach((member) => {
      if (member.email) candidateEmails.add(member.email.toLowerCase())
    })
  })
  project.extraMembers?.forEach((member) => {
    if (member.email) candidateEmails.add(member.email.toLowerCase())
  })
  const registeredEmails = await getRegisteredEmailSet(admin, candidateEmails)
  const enrichedTeams = teams.map((team) => ({
    ...team,
    lead: team.lead ? applyRegisteredFlag(team.lead, registeredEmails) : undefined,
    members: team.members.map((member) => applyRegisteredFlag(member, registeredEmails)),
  }))
  const enrichedProject = {
    ...project,
    extraMembers: project.extraMembers?.map((member) => applyRegisteredFlag(member, registeredEmails)),
  }

  const visibleProjects = filterProjectsForIdentity([enrichedProject], enrichedTeams, identity)
  if (visibleProjects.length === 0) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 })
  }

  let nextProject = enrichedProject
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

  return NextResponse.json({ project: attachRelations(nextProject, enrichedTeams, templates) })
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

  const { data: projectRow } = await admin.from("projects").select(PROJECT_DETAIL_SELECT).eq("slug", slug).maybeSingle()
  if (!projectRow) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 })
  }

  const teamIds = Array.isArray(projectRow.team_ids) ? projectRow.team_ids : []
  const { data: teamRows } =
    teamIds.length > 0 ? await admin.from("teams").select(TEAM_DETAIL_SELECT).in("id", teamIds) : { data: [] }
  const teams = (Array.isArray(teamRows) ? teamRows : []).map(normalizeTeam)
  const currentProject = normalizeProject(projectRow as ProjectRow)
  const ownerPlan = await getPlanForUserId(admin, currentProject.createdBy ?? null)
  const planLimits = getPlanLimits(ownerPlan)
  const isLocked = await isProjectLockedForOwner(
    admin,
    currentProject.createdBy ?? null,
    currentProject.id,
    planLimits.maxProjects,
  )

  const visibleProjects = filterProjectsForIdentity([currentProject], teams, identity)
  if (visibleProjects.length === 0) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const adminRole = isAdminRole(identity.role)
  const leadAccess = isLeadForProject(currentProject, teams, identity.email)
  const onlySubmissionsUpdate =
    Object.keys(body).length > 0 && Object.keys(body).every((key) => key === "submissions")
  const ownerAccess = currentProject.createdBy === identity.userId
  const memberSubmissionsAccess = onlySubmissionsUpdate && visibleProjects.length > 0

  if (isLocked && !onlySubmissionsUpdate) {
    return NextResponse.json({ message: "Project is locked on your current plan." }, { status: 403 })
  }
  if (!memberSubmissionsAccess && !ownerAccess && !adminRole && !leadAccess) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  if (Array.isArray(body.teamIds) && !planLimits.teamAccess) {
    return NextResponse.json({ message: "Teams are not available on your current plan." }, { status: 403 })
  }
  if (Array.isArray(body.extraMembers) && planLimits.maxExternalMembersPerProject !== null) {
    const externalCount = body.extraMembers.filter((member) => {
      if (!member || typeof member !== "object") return false
      const raw = member as { email?: unknown }
      return typeof raw.email === "string" && raw.email.trim()
    }).length
    if (externalCount > planLimits.maxExternalMembersPerProject) {
      return NextResponse.json(
        { message: "External member limit reached for this project." },
        { status: 403 },
      )
    }
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

  if (
    body.submissions &&
    typeof body.submissions === "object" &&
    !Array.isArray(body.submissions) &&
    currentProject.createdBy &&
    hasMeaningfulSubmissionChange(currentProject.submissions as Record<string, unknown>, body.submissions)
  ) {
    const beforeSubmissions = currentProject.submissions as Record<string, unknown>
    const afterSubmissions = body.submissions
    const beforeCount = countChecklistEntries(beforeSubmissions)
    const afterCount = countChecklistEntries(afterSubmissions)
    const addedItems = Math.max(0, afterCount - beforeCount)
    const newlyCompletedSections = getNewlyCompletedSectionIds(beforeSubmissions, afterSubmissions)
    const actorLabel =
      identity.role === "team_lead" ? "Team Lead" : identity.role === "super_admin" ? "Admin" : "Client"
    const { data: actorProfile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", identity.userId)
      .maybeSingle()
    const actorName =
      (actorProfile?.full_name || "").trim() ||
      identity.email ||
      actorLabel
    const ownerEmail = await findUserEmailById(admin, currentProject.createdBy)
    const summaryParts: string[] = []
    if (addedItems > 0) {
      summaryParts.push(`${addedItems} new item${addedItems > 1 ? "s" : ""} added`)
    }
    if (newlyCompletedSections.length > 0) {
      summaryParts.push(`${newlyCompletedSections.length} section${newlyCompletedSections.length > 1 ? "s" : ""} completed`)
    }

    await createProjectActivityNotifications({
      admin,
      ownerId: currentProject.createdBy,
      ownerEmail,
      actorUserId: identity.userId,
      actorEmail: identity.email,
      actorName,
      actor: actorLabel,
      projectId: currentProject.id,
      projectSlug: currentProject.slug,
      projectTitle: currentProject.title,
      teamRows: teams,
      extraMembers: currentProject.extraMembers,
      type: "project_update",
      title: `${actorName} updated project ${currentProject.title}`,
      message: summaryParts.join(" • ") || "Checklist updated",
      status: newlyCompletedSections.length > 0 && addedItems === 0 ? "completed" : "updated",
      metadata: {
        addedItems,
        completedSections: newlyCompletedSections,
      },
      createdBy: identity.userId,
    })
  }

  const { data: updatedRow } = await admin.from("projects").select(PROJECT_DETAIL_SELECT).eq("slug", slug).maybeSingle()
  if (!updatedRow) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 })
  }

  const updatedTeamIds = Array.isArray(updatedRow.team_ids) ? updatedRow.team_ids : []
  const [{ data: updatedTeamRows }, { data: templateRows }] = await Promise.all([
    updatedTeamIds.length > 0
      ? admin.from("teams").select(TEAM_DETAIL_SELECT).in("id", updatedTeamIds)
      : Promise.resolve({ data: [] }),
    admin
      .from("templates")
      .select(TEMPLATE_DETAIL_SELECT)
      .or(`id.eq.${updatedRow.template_id},template_key.eq.${updatedRow.template_id}`),
  ])

  const updatedProject = { ...normalizeProject(updatedRow as ProjectRow), plan: ownerPlan }
  const refreshedTeams = (Array.isArray(updatedTeamRows) ? updatedTeamRows : []).map(normalizeTeam)
  const templates = Array.isArray(templateRows)
    ? (templateRows as TemplateRow[]).map(normalizeTemplate)
    : []

  const candidateEmails = new Set<string>()
  refreshedTeams.forEach((team) => {
    if (team.lead?.email) candidateEmails.add(team.lead.email.toLowerCase())
    team.members.forEach((member) => {
      if (member.email) candidateEmails.add(member.email.toLowerCase())
    })
  })
  updatedProject.extraMembers?.forEach((member) => {
    if (member.email) candidateEmails.add(member.email.toLowerCase())
  })
  const registeredEmails = await getRegisteredEmailSet(admin, candidateEmails)
  const enrichedTeams = refreshedTeams.map((team) => ({
    ...team,
    lead: team.lead ? applyRegisteredFlag(team.lead, registeredEmails) : undefined,
    members: team.members.map((member) => applyRegisteredFlag(member, registeredEmails)),
  }))
  const enrichedProject = {
    ...updatedProject,
    extraMembers: updatedProject.extraMembers?.map((member) => applyRegisteredFlag(member, registeredEmails)),
  }

  return NextResponse.json({ project: attachRelations(enrichedProject, enrichedTeams, templates) })
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
