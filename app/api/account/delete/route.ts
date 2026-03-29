import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"

const ALLOWED_ROLES = new Set(["super_admin", "team_lead", "team_member", "project_member"])

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
    const userEmail = (identity.email || "").trim().toLowerCase()

    if (identity.role !== "super_admin") {
      if (!userEmail) {
        return NextResponse.json({ message: "Missing account email" }, { status: 400 })
      }

      const [{ data: teamRows, error: teamError }, { data: ownedTeams, error: ownedTeamsError }] =
        await Promise.all([
          admin.from("teams").select("id,lead,members"),
          admin.from("teams").select("id").eq("created_by", userId).limit(1),
        ])

      if (teamError || ownedTeamsError) {
        throw new Error(teamError?.message || ownedTeamsError?.message || "Failed to check team access")
      }

      const isInTeam =
        Array.isArray(teamRows) &&
        teamRows.some((team) => {
          const leadEmail = typeof team.lead?.email === "string" ? team.lead.email.trim().toLowerCase() : ""
          if (leadEmail && leadEmail === userEmail) return true
          const members = Array.isArray(team.members) ? team.members : []
          return members.some(
            (member) => typeof member?.email === "string" && member.email.trim().toLowerCase() === userEmail,
          )
        })

      const ownsTeam = Array.isArray(ownedTeams) && ownedTeams.length > 0

      let isInProject = false
      const { data: projectRows, error: projectError } = await admin
        .from("projects")
        .select("id,extra_members")
        .contains("extra_members", [{ email: userEmail }])

      if (projectError) {
        const { data: fallbackRows, error: fallbackError } = await admin
          .from("projects")
          .select("id,extra_members")

        if (fallbackError) {
          throw new Error(fallbackError.message)
        }
        isInProject =
          Array.isArray(fallbackRows) &&
          fallbackRows.some((project) => {
            const members = Array.isArray(project.extra_members) ? project.extra_members : []
            return members.some(
              (member) =>
                typeof member?.email === "string" && member.email.trim().toLowerCase() === userEmail,
            )
          })
      } else {
        isInProject = Array.isArray(projectRows) && projectRows.length > 0
      }

      const { data: ownedProjects, error: ownedProjectsError } = await admin
        .from("projects")
        .select("id")
        .eq("created_by", userId)
        .limit(1)

      if (ownedProjectsError) {
        throw new Error(ownedProjectsError.message)
      }

      const ownsProject = Array.isArray(ownedProjects) && ownedProjects.length > 0

      if (isInTeam || isInProject || ownsTeam || ownsProject) {
        return NextResponse.json(
          {
            message:
              "You can't delete your account while you're part of a team or project. Leave all workspaces first.",
          },
          { status: 409 },
        )
      }
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

    if (identity.role === "super_admin") {
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
