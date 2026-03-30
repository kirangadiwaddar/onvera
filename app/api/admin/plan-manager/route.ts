import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"
import { normalizePlan } from "@/lib/billing/plans"
import { isUserRole } from "@/lib/auth/roles"

function parseAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || ""
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
}

function isAdminEmail(email?: string | null) {
  if (!email) return false
  const admins = parseAdminEmails()
  return admins.has(email.trim().toLowerCase())
}

export async function GET(request: Request) {
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity || !isAdminEmail(identity.email)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ message: "Supabase is not configured" }, { status: 500 })
  }

  const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (usersError) {
    return NextResponse.json({ message: usersError.message }, { status: 500 })
  }
  const userMap = new Map((usersData?.users || []).map((user) => [user.id, user]))

  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("id, full_name, role, plan, created_at")
    .order("created_at", { ascending: false })

  if (profileError) {
    return NextResponse.json({ message: profileError.message }, { status: 500 })
  }

  const rows = (profiles || []).map((profile) => {
    const user = userMap.get(profile.id as string)
    return {
      id: profile.id,
      fullName: profile.full_name ?? "",
      role: profile.role ?? null,
      plan: profile.plan ?? null,
      email: user?.email ?? null,
    }
  })

  return NextResponse.json({ users: rows })
}

export async function PATCH(request: Request) {
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity || !isAdminEmail(identity.email)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as
    | { userId?: string; email?: string; plan?: string; role?: string }
    | null

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ message: "Supabase is not configured" }, { status: 500 })
  }

  const userId = body.userId
  if (!userId || (typeof body.plan !== "string" && typeof body.role !== "string")) {
    return NextResponse.json({ message: "Missing user or update" }, { status: 400 })
  }

  const updatePayload: { plan?: string; role?: string } = {}
  if (typeof body.plan === "string") {
    updatePayload.plan = normalizePlan(body.plan)
  }
  if (typeof body.role === "string") {
    const normalizedRole = body.role.trim()
    if (!isUserRole(normalizedRole)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 })
    }
    updatePayload.role = normalizedRole
  }

  const { error } = await admin
    .from("profiles")
    .update(updatePayload)
    .eq("id", userId)

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...updatePayload })
}
