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

function normalizeMembers(raw?: unknown[] | null) {
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

function normalizeProject(project: ProjectRow) {
  return {
    id: project.id,
    slug: project.slug,
    teamIds: project.team_ids ?? [],
    extraMembers: normalizeMembers(project.extra_members),
    createdBy: project.created_by ?? null,
  } as ProjectLike
}

function normalizeTeams(teams: TeamRow[]) {
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
      }) as TeamLike,
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

function toNoteShape(row: {
  id: string
  author_id?: string | null
  author_name: string
  author_avatar?: string | null
  author_email?: string | null
  message: string
  created_at: string
}, identityUserId: string | null, projectOwnerId: string | null) {
  const canEdit = Boolean(identityUserId && row.author_id && row.author_id === identityUserId)
  const canDelete = canEdit || Boolean(projectOwnerId && identityUserId === projectOwnerId)
  return {
    id: row.id,
    authorName: row.author_name,
    authorAvatar: row.author_avatar ?? undefined,
    authorEmail: row.author_email ?? undefined,
    message: row.message,
    createdAt: row.created_at,
    reactions: [] as { emoji: string; count: number; reacted: boolean }[],
    canEdit,
    canDelete,
  }
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

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const admin = createAdminClient()
  const { slug } = await context.params
  const access = await ensureProjectAccess(admin, slug, request)
  if (access.error) return access.error
  if (!admin) {
    return NextResponse.json({ message: "Supabase is not configured" }, { status: 500 })
  }

  const { data, error } = await admin
    .from("project_notes")
    .select("id, author_id, author_name, author_avatar, author_email, message, created_at")
    .eq("project_id", access.project.id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  const notes = (data || []).map((row) =>
    toNoteShape(row, access.identity?.userId ?? null, access.project.created_by ?? null),
  )

  if (notes.length === 0) {
    return NextResponse.json({ notes })
  }

  const noteIds = notes.map((note) => note.id)
  const { data: reactions } = await admin
    .from("project_note_reactions")
    .select("note_id, emoji, user_id")
    .in("note_id", noteIds)

  const reactionMap = new Map<
    string,
    Map<string, { count: number; reacted: boolean }>
  >()

  ;(reactions || []).forEach((reaction) => {
    const noteId = String((reaction as { note_id?: unknown }).note_id || "")
    const emoji = String((reaction as { emoji?: unknown }).emoji || "")
    const userId = (reaction as { user_id?: unknown }).user_id
    if (!noteId || !emoji) return
    if (!reactionMap.has(noteId)) {
      reactionMap.set(noteId, new Map())
    }
    const byEmoji = reactionMap.get(noteId)!
    const current = byEmoji.get(emoji) || { count: 0, reacted: false }
    byEmoji.set(emoji, {
      count: current.count + 1,
      reacted: Boolean(access.identity?.userId && userId === access.identity.userId) || current.reacted,
    })
  })

  const notesWithReactions = notes.map((note) => {
    const byEmoji = reactionMap.get(note.id)
    const reactions = byEmoji
      ? Array.from(byEmoji.entries()).map(([emoji, data]) => ({
          emoji,
          count: data.count,
          reacted: data.reacted,
        }))
      : []
    return { ...note, reactions }
  })

  return NextResponse.json({ notes: notesWithReactions })
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const admin = createAdminClient()
  const { slug } = await context.params
  const access = await ensureProjectAccess(admin, slug, request)
  if (access.error) return access.error
  if (!admin || !access.identity) {
    return NextResponse.json({ message: "Supabase is not configured" }, { status: 500 })
  }

  const body = await request.json().catch(() => null) as {
    message?: string
    authorName?: string
    authorAvatar?: string
    mentions?: string[]
  } | null

  const message = typeof body?.message === "string" ? body.message.trim() : ""
  if (!message) {
    return NextResponse.json({ message: "Message is required" }, { status: 400 })
  }
  if (message.length > 2000) {
    return NextResponse.json({ message: "Message is too long" }, { status: 400 })
  }

  const authorNameInput = typeof body?.authorName === "string" ? body.authorName.trim() : ""
  let authorName = authorNameInput

  if (!authorName) {
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", access.identity.userId)
      .maybeSingle()
    authorName =
      (profile?.full_name || "").trim() ||
      access.identity.email ||
      "Team member"
  }

  const authorAvatar =
    typeof body?.authorAvatar === "string" && body.authorAvatar.trim()
      ? body.authorAvatar.trim()
      : null

  const { data, error } = await admin
    .from("project_notes")
    .insert({
      project_id: access.project.id,
      project_slug: access.project.slug,
      author_id: access.identity.userId,
      author_name: authorName,
      author_avatar: authorAvatar,
      author_email: access.identity.email,
      message,
    })
    .select("id, author_id, author_name, author_avatar, author_email, message, created_at")
    .single()

  if (error || !data) {
    return NextResponse.json({ message: error?.message || "Unable to add note" }, { status: 500 })
  }

  const mentionEmails = Array.isArray(body?.mentions)
    ? body!.mentions!.filter((email) => typeof email === "string" && email.trim())
    : []
  if (mentionEmails.length > 0) {
    const uniqueMentions = Array.from(new Set(mentionEmails.map((email) => email.trim().toLowerCase())))
    await admin.from("project_note_mentions").insert(
      uniqueMentions.map((email) => ({
        note_id: data.id,
        project_id: access.project.id,
        mentioned_email: email,
      })),
    )
  }

  return NextResponse.json({
    note: toNoteShape(data, access.identity.userId, access.project.created_by ?? null),
  })
}
