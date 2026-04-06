import type { SupabaseClient } from "@supabase/supabase-js"

type MentionNotificationArgs = {
  admin: SupabaseClient
  mentionEmails: string[]
  authorEmail?: string | null
  authorName: string
  actor: "Admin" | "Client" | "Team Lead"
  projectId: number
  projectSlug: string
  createdBy: string
  message: string
}

type NotificationMemberLike = {
  email?: string | null
  accessToken?: string | null
}

type NotificationTeamLike = {
  lead?: NotificationMemberLike | null
  members?: Array<NotificationMemberLike> | null
}

type ProjectActivityNotificationArgs = {
  admin: SupabaseClient
  ownerId?: string | null
  ownerEmail?: string | null
  actorUserId?: string | null
  actorEmail?: string | null
  actorName: string
  actor: "Admin" | "Client" | "Team Lead"
  projectId: number
  projectSlug: string
  projectTitle: string
  teamRows?: NotificationTeamLike[]
  extraMembers?: NotificationMemberLike[]
  type: string
  title: string
  message?: string | null
  status: string
  metadata?: Record<string, unknown>
  createdBy?: string | null
}

const PROJECT_ACTIVITY_DEDUPE_WINDOW_MS = 60_000

type ProjectActivityNotificationRow = {
  user_id: string
  recipient_email: string
  project_id: number
  project_slug: string
  type: string
  title: string
  message: string | null
  actor: "Admin" | "Client" | "Team Lead"
  status: string
  metadata: {
    projectSlug: string
    projectTitle: string
    actorName: string
  } & Record<string, unknown>
  created_by: string | null
  is_read: boolean
}

function normalizeEmail(value?: string | null) {
  return (value || "").trim().toLowerCase()
}

function trimMessage(value: string, max = 220) {
  const cleaned = value.trim()
  if (!cleaned) return ""
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max - 1)}…`
}

export async function resolveUserIdsByEmails(admin: SupabaseClient, emails: string[]) {
  const targets = new Set(emails.map((email) => normalizeEmail(email)).filter(Boolean))
  const byEmail = new Map<string, string>()
  if (targets.size === 0) return byEmail

  let page = 1
  const perPage = 200
  while (byEmail.size < targets.size) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error || !data?.users?.length) break

    for (const user of data.users) {
      const email = normalizeEmail(user.email)
      if (!email || !targets.has(email)) continue
      byEmail.set(email, user.id)
    }

    if (data.users.length < perPage) break
    page += 1
    if (page > 20) break
  }

  return byEmail
}

export async function findUserEmailById(admin: SupabaseClient, userId?: string | null) {
  if (!userId) return null
  const getUserById = (admin.auth.admin as unknown as {
    getUserById?: (id: string) => Promise<{ data?: { user?: { email?: string | null } | null } | null }>
  }).getUserById

  if (typeof getUserById === "function") {
    try {
      const result = await getUserById.call(admin.auth.admin, userId)
      return normalizeEmail(result?.data?.user?.email)
    } catch {
      return null
    }
  }

  let page = 1
  const perPage = 200
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error || !data?.users?.length) break
    const match = data.users.find((user) => user.id === userId)
    if (match?.email) return normalizeEmail(match.email)
    if (data.users.length < perPage) break
    page += 1
    if (page > 20) break
  }

  return null
}

function collectProjectRecipientEmails({
  ownerEmail,
  actorEmail,
  teamRows,
  extraMembers,
}: {
  ownerEmail?: string | null
  actorEmail?: string | null
  teamRows?: NotificationTeamLike[]
  extraMembers?: NotificationMemberLike[]
}) {
  const recipients = new Set<string>()
  const normalizedActor = normalizeEmail(actorEmail)

  const addRecipient = (email?: string | null, options?: { allowAccessToken?: boolean; accessToken?: string | null }) => {
    const normalized = normalizeEmail(email)
    if (!normalized || normalized === normalizedActor) return
    if (!options?.allowAccessToken && options?.accessToken) return
    recipients.add(normalized)
  }

  addRecipient(ownerEmail)
  ;(teamRows || []).forEach((team) => {
    addRecipient(team.lead?.email ?? null)
    ;(team.members || []).forEach((member) => addRecipient(member.email ?? null))
  })
  ;(extraMembers || []).forEach((member) =>
    addRecipient(member.email ?? null, { accessToken: member.accessToken ?? null }),
  )

  return Array.from(recipients)
}

export async function createProjectActivityNotifications({
  admin,
  ownerId,
  ownerEmail,
  actorUserId,
  actorEmail,
  actorName,
  actor,
  projectId,
  projectSlug,
  projectTitle,
  teamRows = [],
  extraMembers = [],
  type,
  title,
  message,
  status,
  metadata,
  createdBy,
}: ProjectActivityNotificationArgs) {
  const resolvedOwnerEmail =
    normalizeEmail(ownerEmail) ||
    (ownerId ? await findUserEmailById(admin, ownerId) : null)

  const recipientEmails = collectProjectRecipientEmails({
    ownerEmail: resolvedOwnerEmail,
    actorEmail,
    teamRows,
    extraMembers,
  })

  if (recipientEmails.length === 0) return

  const userIdsByEmail = await resolveUserIdsByEmails(admin, recipientEmails)
  const rows: ProjectActivityNotificationRow[] = []
  recipientEmails.forEach((recipientEmail) => {
    const userId = userIdsByEmail.get(recipientEmail)
    if (!userId || (actorUserId && userId === actorUserId)) return
    rows.push({
      user_id: userId,
      recipient_email: recipientEmail,
      project_id: projectId,
      project_slug: projectSlug,
      type,
      title,
      message: message?.trim() ? message.trim() : null,
      actor,
      status,
      metadata: {
        projectSlug,
        projectTitle,
        actorName,
        ...(metadata || {}),
      },
      created_by: createdBy ?? null,
      is_read: false,
    })
  })

  if (rows.length === 0) return

  try {
    const threshold = new Date(Date.now() - PROJECT_ACTIVITY_DEDUPE_WINDOW_MS).toISOString()
    const recipientUserIds = Array.from(new Set(rows.map((row) => row.user_id)))
    const { data: recentRows } = await admin
      .from("notifications")
      .select("user_id,title,message,status,actor,type,project_id,created_at")
      .eq("project_id", projectId)
      .eq("type", type)
      .in("user_id", recipientUserIds)
      .gte("created_at", threshold)

    const existingKeys = new Set(
      (recentRows || []).map((row) =>
        [
          row.user_id,
          row.project_id,
          row.type,
          row.title || "",
          row.message || "",
          row.status || "",
          row.actor || "",
        ].join("::"),
      ),
    )

    const dedupedRows = rows.filter((row) => {
      const key = [
        row.user_id,
        row.project_id,
        row.type,
        row.title || "",
        row.message || "",
        row.status || "",
        row.actor || "",
      ].join("::")
      return !existingKeys.has(key)
    })

    if (dedupedRows.length === 0) return

    await admin.from("notifications").insert(dedupedRows)
  } catch {
    // Keep primary writes resilient if notifications insert fails.
  }
}

export async function createMentionNotifications({
  admin,
  mentionEmails,
  authorEmail,
  authorName,
  actor,
  projectId,
  projectSlug,
  createdBy,
  message,
}: MentionNotificationArgs) {
  const normalizedAuthor = normalizeEmail(authorEmail)
  const recipients = Array.from(
    new Set(
      mentionEmails
        .map((email) => normalizeEmail(email))
        .filter((email) => Boolean(email) && email !== normalizedAuthor),
    ),
  )

  if (recipients.length === 0) return

  const userIdsByEmail = await resolveUserIdsByEmails(admin, recipients)
  const preview = trimMessage(message)
  const rows = recipients
    .map((recipientEmail) => {
      const userId = userIdsByEmail.get(recipientEmail)
      if (!userId) return null
      return {
        user_id: userId,
        recipient_email: recipientEmail,
        project_id: projectId,
        project_slug: projectSlug,
        type: "note_mention",
        title: `${authorName} mentioned you in project notes`,
        message: preview || null,
        actor,
        status: "mentioned",
        metadata: { projectSlug },
        created_by: createdBy,
        is_read: false,
      }
    })
    .filter(Boolean) as Array<{
    user_id: string
    recipient_email: string
    project_id: number
    project_slug: string
    type: string
    title: string
    message: string | null
    actor: string
    status: string
    metadata: { projectSlug: string }
    created_by: string
    is_read: boolean
  }>

  if (rows.length === 0) return

  try {
    await admin.from("notifications").insert(rows)
  } catch {
    // Keep note creation resilient if notifications table is not migrated yet.
  }
}
