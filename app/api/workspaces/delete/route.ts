import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"

const ALLOWED_ROLES = new Set(["super_admin"])

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

    const { data: projectsExisting, error: projectsExistingError } = await admin
      .from("projects")
      .select("id")
      .eq("created_by", userId)
      .limit(1)
    if (projectsExistingError && !isMissingCreatedBy(projectsExistingError.message)) {
      throw new Error(projectsExistingError.message)
    }

    const { data: teamsExisting, error: teamsExistingError } = await admin
      .from("teams")
      .select("id")
      .eq("created_by", userId)
      .limit(1)
    if (teamsExistingError && !isMissingCreatedBy(teamsExistingError.message)) {
      throw new Error(teamsExistingError.message)
    }

    const { data: templatesExisting, error: templatesExistingError } = await admin
      .from("templates")
      .select("id")
      .eq("created_by", userId)
      .limit(1)
    if (templatesExistingError && !isMissingCreatedBy(templatesExistingError.message)) {
      throw new Error(templatesExistingError.message)
    }

    const { data: tokensExisting, error: tokensExistingError } = await admin
      .from("onboarding_tokens")
      .select("id")
      .eq("created_by", userId)
      .limit(1)
    if (tokensExistingError && !isMissingCreatedBy(tokensExistingError.message)) {
      throw new Error(tokensExistingError.message)
    }

    const hasData =
      (Array.isArray(projectsExisting) && projectsExisting.length > 0) ||
      (Array.isArray(teamsExisting) && teamsExisting.length > 0) ||
      (Array.isArray(templatesExisting) && templatesExisting.length > 0) ||
      (Array.isArray(tokensExisting) && tokensExisting.length > 0)

    if (hasData) {
      return NextResponse.json(
        { message: "You still have workspace data. Please clear it before deleting your workspace." },
        { status: 400 },
      )
    }

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

    const { error: templatesDeleteError } = await admin
      .from("templates")
      .delete()
      .eq("created_by", userId)
    if (templatesDeleteError && !isMissingCreatedBy(templatesDeleteError.message)) {
      throw new Error(templatesDeleteError.message)
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({ role: "project_member", plan: "free" })
      .eq("id", userId)
    if (profileError) {
      throw new Error(profileError.message)
    }

    await admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        role: "project_member",
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete workspace"
    return NextResponse.json({ message }, { status: 500 })
  }
}
