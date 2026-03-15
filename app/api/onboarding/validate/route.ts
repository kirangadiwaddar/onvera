import { NextResponse } from "next/server"
import { verifyPassword } from "@/lib/auth/password"
import { createAdminClient } from "@/lib/supabase/admin"

type TokenRow = {
  token: string
  project_slug: string
  expires_at: string | null
  revoked: boolean
  used_count: number | null
  max_uses: number | null
  password_hash?: string | null
  password_plain?: string | null
}

function isMissingPasswordColumnError(message?: string | null) {
  if (!message) return false
  return message.includes("password_hash") || message.includes("password_plain")
}

function getInvalidReason(row: TokenRow) {
  const now = Date.now()
  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : null
  const isExpired = expiresAt !== null && expiresAt < now
  const maxUses = row.max_uses ?? 1000
  const usedCount = row.used_count ?? 0
  const usageExceeded = usedCount >= maxUses

  if (row.revoked) return "revoked"
  if (isExpired) return "expired"
  if (usageExceeded) return "used_up"
  return null
}

async function getTokenRecord(token: string, slug: string) {
  const admin = createAdminClient()

  if (!admin) {
    return {
      errorResponse: NextResponse.json(
        { valid: false, message: "Supabase service key is not configured" },
        { status: 500 },
      ),
      record: null,
      admin: null,
    }
  }

  let { data, error } = await admin
    .from("onboarding_tokens")
    .select("token, project_slug, expires_at, revoked, used_count, max_uses, password_hash, password_plain")
    .eq("token", token)
    .eq("project_slug", slug)
    .maybeSingle()

  if (error && isMissingPasswordColumnError(error.message)) {
    const fallback = await admin
      .from("onboarding_tokens")
      .select("token, project_slug, expires_at, revoked, used_count, max_uses")
      .eq("token", token)
      .eq("project_slug", slug)
      .maybeSingle()
    data = fallback.data
      ? {
          ...fallback.data,
          password_hash: null,
          password_plain: null,
        }
      : null
    error = fallback.error
  }

  if (error || !data) {
    return {
      errorResponse: NextResponse.json({ valid: false, message: "Invalid onboarding link" }, { status: 401 }),
      record: null,
      admin,
    }
  }

  return {
    errorResponse: null,
    record: data as TokenRow,
    admin,
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("t") || searchParams.get("token")
  const slug = searchParams.get("slug")

  if (!token || !slug) {
    return NextResponse.json({ valid: false, message: "Missing token or slug" }, { status: 400 })
  }

  const { errorResponse, record } = await getTokenRecord(token, slug)

  if (errorResponse || !record) {
    return errorResponse ?? NextResponse.json({ valid: false, message: "Invalid onboarding link" }, { status: 401 })
  }

  const reason = getInvalidReason(record)
  if (reason) {
    return NextResponse.json(
      { valid: false, status: reason, message: "This onboarding link is no longer active" },
      { status: 401 },
    )
  }

  return NextResponse.json({
    valid: true,
    requiresPassword: Boolean(record.password_hash || record.password_plain),
  })
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { token?: string; slug?: string; password?: string }
    | null

  const token = body?.token?.trim()
  const slug = body?.slug?.trim()
  const password = body?.password ?? ""

  if (!token || !slug) {
    return NextResponse.json({ valid: false, message: "Missing token or slug" }, { status: 400 })
  }

  const { errorResponse, record, admin } = await getTokenRecord(token, slug)

  if (errorResponse || !record || !admin) {
    return errorResponse ?? NextResponse.json({ valid: false, message: "Invalid onboarding link" }, { status: 401 })
  }

  const reason = getInvalidReason(record)
  if (reason) {
    return NextResponse.json(
      { valid: false, status: reason, message: "This onboarding link is no longer active" },
      { status: 401 },
    )
  }

  if (record.password_hash || record.password_plain) {
    const hashOk = record.password_hash ? verifyPassword(password, record.password_hash) : false
    const plainOk = record.password_plain ? password === record.password_plain : false
    if (!hashOk && !plainOk) {
      return NextResponse.json({ valid: false, message: "Incorrect password" }, { status: 401 })
    }
  }

  const usedCount = record.used_count ?? 0
  const { error } = await admin
    .from("onboarding_tokens")
    .update({ used_count: usedCount + 1 })
    .eq("token", token)

  if (error) {
    return NextResponse.json({ valid: false, message: error.message }, { status: 500 })
  }

  return NextResponse.json({ valid: true })
}
