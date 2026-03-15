import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"

const ALLOWED_ROLES = new Set(["agency", "freelancer"])

function isMissingCreatedBy(message?: string | null) {
  return Boolean(message && message.toLowerCase().includes("created_by"))
}

export async function POST(request: Request) {
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

    const { data: projects, error: projectsFetchError } = await admin
      .from("projects")
      .select("slug")
      .eq("created_by", userId)

    if (projectsFetchError && !isMissingCreatedBy(projectsFetchError.message)) {
      throw new Error(projectsFetchError.message)
    }

    const slugs = Array.isArray(projects) ? projects.map((row) => row.slug) : []

    if (slugs.length > 0) {
      const { error: tokenDeleteError } = await admin
        .from("onboarding_tokens")
        .delete()
        .in("project_slug", slugs)
      if (tokenDeleteError) {
        throw new Error(tokenDeleteError.message)
      }
    }

    const { error: tokensByUserError } = await admin
      .from("onboarding_tokens")
      .delete()
      .eq("created_by", userId)
    if (tokensByUserError && !isMissingCreatedBy(tokensByUserError.message)) {
      throw new Error(tokensByUserError.message)
    }

    const { error: projectsDeleteError } = await admin
      .from("projects")
      .delete()
      .eq("created_by", userId)
    if (projectsDeleteError && !isMissingCreatedBy(projectsDeleteError.message)) {
      throw new Error(projectsDeleteError.message)
    }

    const { error: teamsDeleteError } = await admin
      .from("teams")
      .delete()
      .eq("created_by", userId)
    if (teamsDeleteError && !isMissingCreatedBy(teamsDeleteError.message)) {
      throw new Error(teamsDeleteError.message)
    }

    const { error: profileDeleteError } = await admin
      .from("profiles")
      .delete()
      .eq("id", userId)
    if (profileDeleteError) {
      throw new Error(profileDeleteError.message)
    }

    const { error: userDeleteError } = await admin.auth.admin.deleteUser(userId)
    if (userDeleteError) {
      throw new Error(userDeleteError.message)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete account"
    return NextResponse.json({ message }, { status: 500 })
  }
}
