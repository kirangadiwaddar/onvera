import { randomBytes } from "crypto"
import { NextResponse } from "next/server"
import { isInternalRole } from "@/lib/auth/roles"
import { hashPassword } from "@/lib/auth/password"
import { filterProjectsForIdentity, isAdminRole, isLeadForProject } from "@/lib/auth/access"
import { getStoreData } from "@/lib/server/data-store"
import { createAdminClient } from "@/lib/supabase/admin"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"

type TokenRow = {
  token: string
  project_slug: string
  expires_at: string | null
  revoked: boolean
  used_count: number | null
  max_uses: number | null
  password_hash?: string | null
  password_plain?: string | null
  created_at: string
}

function isMissingPasswordColumnError(message?: string | null) {
  if (!message) return false
  return message.includes("password_hash") || message.includes("password_plain")
}

function computeStatus(row: TokenRow) {
  if (row.revoked) return "revoked"
  const now = Date.now()
  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : null
  if (expiresAt !== null && expiresAt < now) return "expired"
  const maxUses = row.max_uses ?? 1000
  const usedCount = row.used_count ?? 0
  if (usedCount >= maxUses) return "used_up"
  return "active"
}

function toPayload(row: TokenRow) {
  return {
    token: row.token,
    projectSlug: row.project_slug,
    expiresAt: row.expires_at,
    maxUses: row.max_uses ?? 1000,
    usedCount: row.used_count ?? 0,
    status: computeStatus(row),
    hasPassword: Boolean(row.password_hash || row.password_plain),
    password: row.password_plain ?? "",
    url: `/onboarding/${row.project_slug}?t=${row.token}`,
    createdAt: row.created_at,
  }
}

async function authorizeInternalUser(request: Request) {
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return { ok: false as const, status: 401, message: "Unauthorized" }
  }

  const effectiveRole = identity.role

  // Keep explicit role guard when role is available.
  // If role is missing in both profile and metadata, allow authenticated user
  // to avoid blocking token management due to incomplete profile setup.
  if (effectiveRole && !isInternalRole(effectiveRole)) {
    return { ok: false as const, status: 403, message: "Forbidden" }
  }

  return { ok: true as const, userId: identity.userId }
}

async function authorizeProjectAccess(request: Request, projectSlug: string, mode: "read" | "manage") {
  const identity = await getRequestIdentityFromRequest(request)

  if (!identity) {
    return { ok: false as const, status: 401, message: "Unauthorized" }
  }

  const { projects, teams } = await getStoreData()
  const visibleProjects = filterProjectsForIdentity(projects, teams, identity)
  const project = visibleProjects.find((item) => item.slug === projectSlug)

  if (!project) {
    return { ok: false as const, status: 403, message: "Forbidden" }
  }

  if (mode === "read") {
    return { ok: true as const }
  }

  if (isAdminRole(identity.role) || isLeadForProject(project, teams, identity.email)) {
    return { ok: true as const }
  }

  return { ok: false as const, status: 403, message: "Forbidden" }
}

export async function GET(request: Request) {
  const auth = await authorizeInternalUser(request)

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const projectSlug = searchParams.get("projectSlug")?.trim()

  if (!projectSlug) {
    return NextResponse.json({ message: "projectSlug is required" }, { status: 400 })
  }

  const access = await authorizeProjectAccess(request, projectSlug, "read")
  if (!access.ok) {
    return NextResponse.json({ message: access.message }, { status: access.status })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ message: "Supabase service key is not configured" }, { status: 500 })
  }

  const { data, error } = await admin
    .from("onboarding_tokens")
    .select("token, project_slug, expires_at, revoked, used_count, max_uses, password_hash, password_plain, created_at")
    .eq("project_slug", projectSlug)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error && !isMissingPasswordColumnError(error.message)) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  if (error && isMissingPasswordColumnError(error.message)) {
    const fallback = await admin
      .from("onboarding_tokens")
      .select("token, project_slug, expires_at, revoked, used_count, max_uses, created_at")
      .eq("project_slug", projectSlug)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fallback.error) {
      return NextResponse.json({ message: fallback.error.message }, { status: 500 })
    }

    if (!fallback.data) {
      return NextResponse.json({ token: null })
    }

    return NextResponse.json({ token: toPayload(fallback.data as TokenRow) })
  }

  if (!data) {
    return NextResponse.json({ token: null })
  }

  return NextResponse.json({ token: toPayload(data as TokenRow) })
}

export async function POST(request: Request) {
  const auth = await authorizeInternalUser(request)

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status })
  }

  const body = (await request.json().catch(() => null)) as
    | { projectSlug?: string; expiresInDays?: number; maxUses?: number; password?: string }
    | null

  const projectSlug = body?.projectSlug?.trim()
  const expiresInDays = body?.expiresInDays ?? 5
  const maxUses = body?.maxUses ?? 1000
  const password = body?.password?.trim() || ""

  if (!projectSlug) {
    return NextResponse.json({ message: "projectSlug is required" }, { status: 400 })
  }

  const access = await authorizeProjectAccess(request, projectSlug, "manage")
  if (!access.ok) {
    return NextResponse.json({ message: access.message }, { status: access.status })
  }

  const admin = createAdminClient()

  if (!admin) {
    return NextResponse.json(
      { message: "Supabase service key is not configured" },
      { status: 500 },
    )
  }

  // 128-bit token in base64url form keeps links short while remaining strong.
  const token = randomBytes(16).toString("base64url")
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()

  let { error } = await admin.from("onboarding_tokens").insert({
    token,
    project_slug: projectSlug,
    created_by: auth.userId,
    expires_at: expiresAt,
    max_uses: Math.max(1, maxUses),
    password_hash: password ? hashPassword(password) : null,
    password_plain: password || null,
  })

  if (error && isMissingPasswordColumnError(error.message)) {
    if (password) {
      return NextResponse.json(
        { message: "Password columns are missing. Run latest migration to enable password-protected links." },
        { status: 400 },
      )
    }

    const fallbackInsert = await admin.from("onboarding_tokens").insert({
      token,
      project_slug: projectSlug,
      created_by: auth.userId,
      expires_at: expiresAt,
      max_uses: Math.max(1, maxUses),
    })
    error = fallbackInsert.error
  }

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({
    token,
    projectSlug,
    expiresAt,
    maxUses: Math.max(1, maxUses),
    usedCount: 0,
    status: "active",
    hasPassword: Boolean(password),
    password,
    url: `/onboarding/${projectSlug}?t=${token}`,
  })
}

export async function PATCH(request: Request) {
  const auth = await authorizeInternalUser(request)

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status })
  }

  const body = (await request.json().catch(() => null)) as
    | { token?: string; revoked?: boolean; password?: string; maxUses?: number; expiresInDays?: number; resetUsage?: boolean }
    | null

  const token = body?.token?.trim()

  if (!token) {
    return NextResponse.json({ message: "token is required" }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ message: "Supabase service key is not configured" }, { status: 500 })
  }

  const tokenLookup = await admin
    .from("onboarding_tokens")
    .select("project_slug")
    .eq("token", token)
    .maybeSingle()

  if (tokenLookup.error) {
    return NextResponse.json({ message: tokenLookup.error.message }, { status: 500 })
  }

  const projectSlug = tokenLookup.data?.project_slug
  if (!projectSlug) {
    return NextResponse.json({ message: "Token not found" }, { status: 404 })
  }

  const access = await authorizeProjectAccess(request, projectSlug, "manage")
  if (!access.ok) {
    return NextResponse.json({ message: access.message }, { status: access.status })
  }

  const updatePayload: Record<string, unknown> = {}

  if (typeof body?.revoked === "boolean") {
    updatePayload.revoked = body.revoked
  }

  if (typeof body?.maxUses === "number" && body.maxUses > 0) {
    updatePayload.max_uses = Math.max(1, Math.floor(body.maxUses))
  }

  if (typeof body?.expiresInDays === "number" && body.expiresInDays > 0) {
    updatePayload.expires_at = new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
  }

  if (typeof body?.password === "string") {
    const normalized = body.password.trim()
    updatePayload.password_hash = normalized ? hashPassword(normalized) : null
    updatePayload.password_plain = normalized || null
  }

  if (body?.resetUsage === true) {
    updatePayload.used_count = 0
    updatePayload.revoked = false
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ message: "No updates provided" }, { status: 400 })
  }

  let { error } = await admin.from("onboarding_tokens").update(updatePayload).eq("token", token)

  if (error && isMissingPasswordColumnError(error.message)) {
    const includesPasswordUpdate = "password_hash" in updatePayload || "password_plain" in updatePayload

    if (includesPasswordUpdate) {
      return NextResponse.json(
        { message: "Password columns are missing. Run latest migration to enable password protection." },
        { status: 400 },
      )
    }

    const fallbackPayload: Record<string, unknown> = {}
    if ("revoked" in updatePayload) fallbackPayload.revoked = updatePayload.revoked
    if ("max_uses" in updatePayload) fallbackPayload.max_uses = updatePayload.max_uses
    if ("expires_at" in updatePayload) fallbackPayload.expires_at = updatePayload.expires_at

    const fallbackUpdate = await admin.from("onboarding_tokens").update(fallbackPayload).eq("token", token)
    error = fallbackUpdate.error
  }

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  let { data, error: fetchError } = await admin
    .from("onboarding_tokens")
    .select("token, project_slug, expires_at, revoked, used_count, max_uses, password_hash, password_plain, created_at")
    .eq("token", token)
    .maybeSingle()

  if (fetchError && isMissingPasswordColumnError(fetchError.message)) {
    const fallbackFetch = await admin
      .from("onboarding_tokens")
      .select("token, project_slug, expires_at, revoked, used_count, max_uses, created_at")
      .eq("token", token)
      .maybeSingle()
    data = fallbackFetch.data
      ? {
          ...fallbackFetch.data,
          password_hash: null,
          password_plain: null,
        }
      : null
    fetchError = fallbackFetch.error
  }

  if (fetchError) {
    return NextResponse.json({ message: fetchError.message }, { status: 500 })
  }

  return NextResponse.json({ token: data ? toPayload(data as TokenRow) : null })
}
