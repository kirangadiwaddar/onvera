import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { filterProjectsForIdentity } from "@/lib/auth/access"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"
import { canUseNotes } from "@/lib/billing/plans"
import { getPlanForUserId } from "@/lib/billing/server"

type ProjectRow = {
  id: number
  slug: string
  team_ids?: number[] | null
  extra_members?: unknown[] | null
  created_by?: string | null
}

type TeamRow = {
  id: number
  lead?: unknown | null
  members?: unknown[] | null
  created_by?: string | null
}

type MemberLike = {
  email?: string
}

type ProjectLike = {
  id: number
  slug: string
  teamIds: number[]
  extraMembers?: MemberLike[]
  createdBy?: string | null
}

type TeamLike = {
  id: number
  lead?: MemberLike
  members?: MemberLike[]
  createdBy?: string | null
}

function normalizeMembers(raw?: unknown[] | null): MemberLike[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null
      const candidate = entry as { email?: unknown }
      if (typeof candidate.email === "string" && candidate.email.trim()) {
        return { email: candidate.email }
      }
      return null
    })
    .filter(Boolean) as MemberLike[]
}

function normalizeProject(project: ProjectRow): ProjectLike {
  return {
    id: project.id,
    slug: project.slug,
    teamIds: project.team_ids ?? [],
    extraMembers: normalizeMembers(project.extra_members),
    createdBy: project.created_by ?? null,
  }
}

function normalizeTeams(teams: TeamRow[]): TeamLike[] {
  return teams.map(
    (team) =>
      ({
        id: team.id,
        lead:
          team.lead && typeof team.lead === "object"
            ? { email: (team.lead as { email?: unknown }).email as string | undefined }
            : undefined,
        members: normalizeMembers(team.members),
        createdBy: team.created_by ?? null,
      }),
  )
}

async function getProjectWithTeams(admin: ReturnType<typeof createAdminClient>, slug: string) {
  if (!admin) return null
  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id, slug, team_ids, extra_members, created_by")
    .eq("slug", slug)
    .maybeSingle()

  if (projectError || !project) return null

  const teamIds = project.team_ids ?? []
  const { data: teams } = teamIds.length
    ? await admin
        .from("teams")
        .select("id, lead, members, created_by")
        .in("id", teamIds)
    : { data: [] as TeamRow[] }

  return { project, teams: teams ?? [] }
}

async function ensureProjectAccess(
  admin: ReturnType<typeof createAdminClient>,
  slug: string,
  request: Request,
) {
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) }
  }

  if (!admin) {
    return { error: NextResponse.json({ message: "Supabase is not configured" }, { status: 500 }) }
  }

  const result = await getProjectWithTeams(admin, slug)
  if (!result) {
    return { error: NextResponse.json({ message: "Project not found" }, { status: 404 }) }
  }

  const normalizedProject = normalizeProject(result.project)
  const normalizedTeams = normalizeTeams(result.teams)
  const allowed = filterProjectsForIdentity([normalizedProject], normalizedTeams, identity)

  if (allowed.length === 0) {
    return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) }
  }

  return { identity, project: result.project }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string; noteId: string }> },
) {
  const admin = createAdminClient()
  const { slug, noteId } = await context.params
  const access = await ensureProjectAccess(admin, slug, request)
  if (access.error) return access.error
  if (!admin || !access.identity) {
    return NextResponse.json({ message: "Supabase is not configured" }, { status: 500 })
  }
  const ownerPlan = await getPlanForUserId(admin, access.project.created_by ?? null)
  if (!canUseNotes(ownerPlan)) {
    return NextResponse.json({ message: "Project notes are not available on this plan." }, { status: 403 })
  }

  const { data: note, error: noteError } = await admin
    .from("project_notes")
    .select("id, author_id, author_name, author_avatar, author_email, message, created_at, project_id")
    .eq("id", noteId)
    .eq("project_id", access.project.id)
    .maybeSingle()

  if (noteError || !note) {
    return NextResponse.json({ message: "Note not found" }, { status: 404 })
  }

  if (note.author_id !== access.identity.userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => null) as { message?: string; mentions?: string[] } | null
  const message = typeof body?.message === "string" ? body.message.trim() : ""
  if (!message) {
    return NextResponse.json({ message: "Message is required" }, { status: 400 })
  }
  if (message.length > 2000) {
    return NextResponse.json({ message: "Message is too long" }, { status: 400 })
  }

  const { data, error } = await admin
    .from("project_notes")
    .update({ message })
    .eq("id", note.id)
    .select("id, author_id, author_name, author_avatar, author_email, message, created_at")
    .single()

  if (error || !data) {
    return NextResponse.json({ message: error?.message || "Unable to update note" }, { status: 500 })
  }

  const mentionEmails = Array.isArray(body?.mentions)
    ? body!.mentions!.filter((email) => typeof email === "string" && email.trim())
    : []
  await admin.from("project_note_mentions").delete().eq("note_id", note.id)
  if (mentionEmails.length > 0) {
    const uniqueMentions = Array.from(new Set(mentionEmails.map((email) => email.trim().toLowerCase())))
    await admin.from("project_note_mentions").insert(
      uniqueMentions.map((email) => ({
        note_id: note.id,
        project_id: access.project.id,
        mentioned_email: email,
      })),
    )
  }

  return NextResponse.json({
    note: {
      id: data.id,
      authorName: data.author_name,
      authorAvatar: data.author_avatar ?? undefined,
      authorEmail: data.author_email ?? undefined,
      message: data.message,
      createdAt: data.created_at,
      reactions: [],
      canEdit: true,
      canDelete: true,
    },
  })
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string; noteId: string }> },
) {
  const admin = createAdminClient()
  const { slug, noteId } = await context.params
  const access = await ensureProjectAccess(admin, slug, request)
  if (access.error) return access.error
  if (!admin || !access.identity) {
    return NextResponse.json({ message: "Supabase is not configured" }, { status: 500 })
  }
  const ownerPlan = await getPlanForUserId(admin, access.project.created_by ?? null)
  if (!canUseNotes(ownerPlan)) {
    return NextResponse.json({ message: "Project notes are not available on this plan." }, { status: 403 })
  }

  const { data: note, error: noteError } = await admin
    .from("project_notes")
    .select("id, author_id, project_id")
    .eq("id", noteId)
    .eq("project_id", access.project.id)
    .maybeSingle()

  if (noteError || !note) {
    return NextResponse.json({ message: "Note not found" }, { status: 404 })
  }

  const isOwner = access.project.created_by && access.project.created_by === access.identity.userId
  const isAuthor = note.author_id && note.author_id === access.identity.userId
  if (!isOwner && !isAuthor) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const { error } = await admin
    .from("project_notes")
    .delete()
    .eq("id", note.id)

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
