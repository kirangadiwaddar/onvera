import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"

const ALLOWED_ROLES = new Set(["super_admin"])

function isMissingCreatedBy(message?: string | null) {
  return Boolean(message && message.toLowerCase().includes("created_by"))
}

export async function GET(request: Request) {
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  if (!ALLOWED_ROLES.has(identity.role || "")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ message: "Supabase service key is not configured" }, { status: 500 })
  }

  try {
    const userId = identity.userId

    const [{ count: projectsCount, error: projectsError }, { count: teamsCount, error: teamsError }, { count: templatesCount, error: templatesError }] =
      await Promise.all([
        admin.from("projects").select("id", { count: "exact", head: true }).eq("created_by", userId),
        admin.from("teams").select("id", { count: "exact", head: true }).eq("created_by", userId),
        admin.from("templates").select("id", { count: "exact", head: true }).eq("created_by", userId),
      ])

    if (projectsError && !isMissingCreatedBy(projectsError.message)) {
      throw new Error(projectsError.message)
    }
    if (teamsError && !isMissingCreatedBy(teamsError.message)) {
      throw new Error(teamsError.message)
    }
    if (templatesError && !isMissingCreatedBy(templatesError.message)) {
      throw new Error(templatesError.message)
    }

    const projectSlugsResponse = await admin
      .from("projects")
      .select("slug")
      .eq("created_by", userId)

    if (projectSlugsResponse.error && !isMissingCreatedBy(projectSlugsResponse.error.message)) {
      throw new Error(projectSlugsResponse.error.message)
    }

    const slugs = Array.isArray(projectSlugsResponse.data)
      ? projectSlugsResponse.data.map((row) => row.slug)
      : []

    let tokensCount = 0
    if (slugs.length > 0) {
      const { count: tokensBySlug, error: tokensBySlugError } = await admin
        .from("onboarding_tokens")
        .select("id", { count: "exact", head: true })
        .in("project_slug", slugs)

      if (tokensBySlugError && !isMissingCreatedBy(tokensBySlugError.message)) {
        throw new Error(tokensBySlugError.message)
      }

      tokensCount = tokensBySlug ?? 0
    } else {
      const { count: tokensByUser, error: tokensByUserError } = await admin
        .from("onboarding_tokens")
        .select("id", { count: "exact", head: true })
        .eq("created_by", userId)

      if (tokensByUserError && !isMissingCreatedBy(tokensByUserError.message)) {
        throw new Error(tokensByUserError.message)
      }

      tokensCount = tokensByUser ?? 0
    }

    const counts = {
      projects: projectsCount ?? 0,
      teams: teamsCount ?? 0,
      templates: templatesCount ?? 0,
      tokens: tokensCount,
    }

    const hasData = Object.values(counts).some((value) => value > 0)

    return NextResponse.json({ hasData, counts })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load reset status"
    return NextResponse.json({ message }, { status: 500 })
  }
}
