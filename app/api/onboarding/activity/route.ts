import { NextResponse } from "next/server"
import { getStoreData } from "@/lib/server/data-store"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const revalidate = 0

type TokenRow = {
  token: string
  project_slug: string
  expires_at: string | null
  revoked: boolean
  used_count: number | null
  max_uses: number | null
}

type ActivityItem = {
  id: string
  title: string
  project: string
  status: string
  actor: "Admin" | "Client" | "Team Lead"
  timestamp: string
}

type SubmissionValue = {
  value?: string
  status?: string
  submittedAt?: string
}

type DynamicRow = {
  name?: string
  url?: string
  status?: string
  submittedAt?: string
}

function formatLabel(value: string) {
  return value
    .replace(/^custom-/, "")
    .replace(/[_-]+/g, " ")
    .trim()
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

async function validateToken(token: string, slug: string) {
  const admin = createAdminClient()
  if (!admin) {
    return {
      errorResponse: NextResponse.json({ message: "Supabase service key is not configured" }, { status: 500 }),
      admin: null,
    }
  }

  const { data, error } = await admin
    .from("onboarding_tokens")
    .select("token, project_slug, expires_at, revoked, used_count, max_uses")
    .eq("token", token)
    .eq("project_slug", slug)
    .maybeSingle()

  if (error || !data) {
    return {
      errorResponse: NextResponse.json({ message: "Invalid onboarding link" }, { status: 401 }),
      admin,
    }
  }

  const reason = getInvalidReason(data as TokenRow)
  if (reason) {
    return {
      errorResponse: NextResponse.json(
        { message: "This onboarding link is no longer active" },
        { status: 401 },
      ),
      admin,
    }
  }

  return { errorResponse: null, admin }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get("slug")?.trim()
  const token = searchParams.get("token")?.trim()
  const limitRaw = Number(searchParams.get("limit") ?? "50")
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50
  const requireToken = process.env.NEXT_PUBLIC_REQUIRE_ONBOARDING_TOKEN !== "false"

  if (!slug) {
    return NextResponse.json({ message: "Missing slug" }, { status: 400 })
  }

  let admin = createAdminClient()
  if (requireToken) {
    if (!token) {
      return NextResponse.json({ message: "Missing onboarding token" }, { status: 401 })
    }
    const { errorResponse, admin: validatedAdmin } = await validateToken(token, slug)
    if (errorResponse) return errorResponse
    admin = validatedAdmin
  }

  const { projects } = await getStoreData()
  const project = projects.find((item) => item.slug === slug)
  if (!project) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 })
  }

  const activities: ActivityItem[] = []

  activities.push({
    id: `${project.slug}-created`,
    title: "Project created",
    project: project.title,
    status: "created",
    actor: "Admin",
    timestamp: project.createdAt,
  })

  if (
    project.status !== "ongoing" &&
    project.updatedAt &&
    new Date(project.updatedAt).getTime() > new Date(project.createdAt).getTime()
  ) {
    activities.push({
      id: `${project.slug}-status-${project.updatedAt}`,
      title: `Project status is ${project.status}`,
      project: project.title,
      status: project.status,
      actor: "Admin",
      timestamp: project.updatedAt,
    })
  }

  const submissions = (project.submissions || {}) as Record<string, unknown>
  Object.entries(submissions).forEach(([key, raw]) => {
    if (key === "__custom_sections") return

    if (Array.isArray(raw)) {
      raw.forEach((row, index) => {
        if (!row || typeof row !== "object") return
        const dynamic = row as DynamicRow
        if (!dynamic.submittedAt) return
        const status = dynamic.status || "submitted"
        const label = formatLabel(dynamic.name || key || `row-${index + 1}`)
        const actor = status === "submitted" ? "Client" : "Admin"
        const title =
          status === "approved"
            ? `${label} approved`
            : status === "rejected"
              ? `${label} rejected`
              : `${label} submitted`
        activities.push({
          id: `${project.slug}-${key}-${index}-${dynamic.submittedAt}-${status}`,
          title,
          project: project.title,
          status,
          actor,
          timestamp: dynamic.submittedAt,
        })
      })
      return
    }

    if (!raw || typeof raw !== "object") return
    const value = raw as SubmissionValue
    if (!value.submittedAt) return
    const status = value.status || "submitted"
    const label = formatLabel(key)
    const actor = status === "submitted" ? "Client" : "Admin"
    const title =
      status === "approved"
        ? `${label} approved`
        : status === "rejected"
          ? `${label} rejected`
          : `${label} submitted`
    activities.push({
      id: `${project.slug}-${key}-${value.submittedAt}-${status}`,
      title,
      project: project.title,
      status,
      actor,
      timestamp: value.submittedAt,
    })
  })

  if (admin) {
    const { data } = await admin
      .from("onboarding_tokens")
      .select("token, project_slug, created_at")
      .eq("project_slug", slug)
      .order("created_at", { ascending: false })
      .limit(20)

    if (Array.isArray(data)) {
      data.forEach((row) => {
        activities.push({
          id: `onboarding-${row.token}`,
          title: "Client access link generated",
          project: project.title,
          status: "generated",
          actor: "Admin",
          timestamp: row.created_at,
        })
      })
    }
  }

  const recentActivities = activities
    .filter((activity) => activity.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)

  return NextResponse.json({ activities: recentActivities })
}
