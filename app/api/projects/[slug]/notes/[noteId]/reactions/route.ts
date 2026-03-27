import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { filterProjectsForIdentity } from "@/lib/auth/access"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"

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

function normalizeProject(project: ProjectRow) {
  return {
    id: project.id,
    slug: project.slug,
    teamIds: project.team_ids ?? [],
    extraMembers: project.extra_members ?? [],
    createdBy: project.created_by ?? null,
  }
}

function normalizeTeams(teams: TeamRow[]) {
  return teams.map((team) => ({
    id: team.id,
    lead: team.lead ?? undefined,
    members: team.members ?? undefined,
    createdBy: team.created_by ?? null,
  }))
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

export async function POST(
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

  const body = await request.json().catch(() => null) as { emoji?: string } | null
  const emoji = typeof body?.emoji === "string" ? body.emoji.trim() : ""
  if (!emoji) {
    return NextResponse.json({ message: "Emoji is required" }, { status: 400 })
  }
  if (emoji.length > 16) {
    return NextResponse.json({ message: "Emoji is too long" }, { status: 400 })
  }

  const { data: note, error: noteError } = await admin
    .from("project_notes")
    .select("id, project_id")
    .eq("id", noteId)
    .eq("project_id", access.project.id)
    .maybeSingle()

  if (noteError || !note) {
    return NextResponse.json({ message: "Note not found" }, { status: 404 })
  }

  const { data: existing } = await admin
    .from("project_note_reactions")
    .select("id")
    .eq("note_id", note.id)
    .eq("user_id", access.identity.userId)
    .eq("emoji", emoji)
    .maybeSingle()

  if (existing) {
    await admin.from("project_note_reactions").delete().eq("id", existing.id)
  } else {
    await admin.from("project_note_reactions").insert({
      note_id: note.id,
      project_id: access.project.id,
      user_id: access.identity.userId,
      emoji,
    })
  }

  const { data: reactions } = await admin
    .from("project_note_reactions")
    .select("note_id, emoji, user_id")
    .eq("note_id", note.id)

  const byEmoji = new Map<string, { count: number; reacted: boolean }>()
  ;(reactions || []).forEach((reaction) => {
    const reactionEmoji = String((reaction as { emoji?: unknown }).emoji || "")
    const userId = (reaction as { user_id?: unknown }).user_id
    if (!reactionEmoji) return
    const current = byEmoji.get(reactionEmoji) || { count: 0, reacted: false }
    byEmoji.set(reactionEmoji, {
      count: current.count + 1,
      reacted: Boolean(userId && userId === access.identity.userId) || current.reacted,
    })
  })

  const reactionsPayload = Array.from(byEmoji.entries()).map(([reactionEmoji, data]) => ({
    emoji: reactionEmoji,
    count: data.count,
    reacted: data.reacted,
  }))

  return NextResponse.json({ reactions: reactionsPayload })
}
