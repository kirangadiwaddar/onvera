import { NextResponse } from "next/server"

import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"
import { createAdminClient } from "@/lib/supabase/admin"

type NotificationRow = {
  id: string
  title: string
  message: string | null
  project_slug: string | null
  status: string
  actor: string | null
  created_at: string
  is_read: boolean
}

type NotificationActivity = {
  id: string
  title: string
  project?: string
  status: string
  actor?: "Admin" | "Client" | "Team Lead"
  created_at: string
  is_read: boolean
}

function isMissingNotificationSchemaError(error?: { code?: string } | null) {
  if (!error?.code) return false
  return error.code === "42P01" || error.code === "42703"
}

function normalizeActor(value?: string | null): "Admin" | "Client" | "Team Lead" {
  if (!value) return "Admin"
  if (value === "Client") return "Client"
  if (value === "Team Lead") return "Team Lead"
  return "Admin"
}

function toActivity(row: NotificationRow): NotificationActivity {
  return {
    id: row.id,
    title: row.title,
    project: row.project_slug || undefined,
    status: row.status || "info",
    actor: normalizeActor(row.actor),
    created_at: row.created_at,
    is_read: Boolean(row.is_read),
  }
}

export async function GET(request: Request) {
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limitRaw = Number(searchParams.get("limit") ?? "50")
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ activities: [], unreadCount: 0 })
  }

  const { data, error } = await admin
    .from("notifications")
    .select("id, title, message, project_slug, status, actor, created_at, is_read")
    .eq("user_id", identity.userId)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    if (isMissingNotificationSchemaError(error as { code?: string })) {
      return NextResponse.json({ activities: [], unreadCount: 0 })
    }
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  const activities = (data || []).map((row) => toActivity(row as NotificationRow))
  const unreadCount = activities.reduce((count, item) => (item.is_read ? count : count + 1), 0)

  return NextResponse.json({ activities, unreadCount })
}

export async function PATCH(request: Request) {
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null) as { action?: string; id?: string } | null
  const action = typeof body?.action === "string" ? body.action : ""
  const id = typeof body?.id === "string" ? body.id : ""
  const now = new Date().toISOString()

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ message: "Supabase is not configured" }, { status: 500 })
  }

  if (action === "mark_all_read") {
    const { error } = await admin
      .from("notifications")
      .update({ is_read: true, read_at: now })
      .eq("user_id", identity.userId)
      .is("dismissed_at", null)
      .eq("is_read", false)

    if (error) {
      if (isMissingNotificationSchemaError(error as { code?: string })) {
        return NextResponse.json({ ok: true })
      }
      return NextResponse.json({ message: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  if (action === "dismiss_all") {
    const { error } = await admin
      .from("notifications")
      .update({ dismissed_at: now })
      .eq("user_id", identity.userId)
      .is("dismissed_at", null)

    if (error) {
      if (isMissingNotificationSchemaError(error as { code?: string })) {
        return NextResponse.json({ ok: true })
      }
      return NextResponse.json({ message: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  if (action === "mark_read" && id) {
    const { error } = await admin
      .from("notifications")
      .update({ is_read: true, read_at: now })
      .eq("id", id)
      .eq("user_id", identity.userId)

    if (error) {
      if (isMissingNotificationSchemaError(error as { code?: string })) {
        return NextResponse.json({ ok: true })
      }
      return NextResponse.json({ message: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  if (action === "dismiss" && id) {
    const { error } = await admin
      .from("notifications")
      .update({ dismissed_at: now })
      .eq("id", id)
      .eq("user_id", identity.userId)

    if (error) {
      if (isMissingNotificationSchemaError(error as { code?: string })) {
        return NextResponse.json({ ok: true })
      }
      return NextResponse.json({ message: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ message: "Invalid action" }, { status: 400 })
}
