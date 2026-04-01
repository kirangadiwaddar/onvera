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

function normalizeEmail(value?: string | null) {
  return (value || "").trim().toLowerCase()
}

function trimMessage(value: string, max = 220) {
  const cleaned = value.trim()
  if (!cleaned) return ""
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max - 1)}…`
}

async function resolveUserIdsByEmails(admin: SupabaseClient, emails: string[]) {
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
