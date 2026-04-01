import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"

const ALLOWED_ROLES = new Set(["super_admin", "team_lead", "team_member", "project_member"])

function isMissingCreatedBy(message?: string | null) {
  return Boolean(message && message.toLowerCase().includes("created_by"))
}

function normalizeEmail(value?: string | null) {
  return (value || "").trim().toLowerCase()
}

type DeleteImpact = {
  ownedProjects: number
  ownedTeams: number
  ownedTemplates: number
  ownedTokens: number
  teamMemberships: number
  projectMemberships: number
  hasData: boolean
}

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

async function getDeleteImpact(
  admin: AdminClient,
  userId: string,
  userEmail: string,
): Promise<DeleteImpact> {
  const [{ data: ownedProjects }, { data: ownedTeams }, { data: ownedTemplates }, { data: ownedTokens }] =
    await Promise.all([
      admin.from("projects").select("id").eq("created_by", userId),
      admin.from("teams").select("id").eq("created_by", userId),
      admin.from("templates").select("id").eq("created_by", userId),
      admin.from("onboarding_tokens").select("id").eq("created_by", userId),
    ])

  const { data: teamRows } = await admin.from("teams").select("id,lead,members")
  const teamMemberships = Array.isArray(teamRows)
    ? teamRows.filter((team) => {
        const leadEmail = normalizeEmail(typeof team.lead?.email === "string" ? team.lead.email : null)
        if (leadEmail && leadEmail === userEmail) return true
        const members = Array.isArray(team.members) ? team.members : []
        return members.some(
          (member) => normalizeEmail(typeof member?.email === "string" ? member.email : null) === userEmail,
        )
      }).length
    : 0

  const { data: projectRows } = await admin.from("projects").select("id,extra_members")
  const projectMemberships = Array.isArray(projectRows)
    ? projectRows.filter((project) => {
        const members = Array.isArray(project.extra_members) ? project.extra_members : []
        return members.some(
          (member) => normalizeEmail(typeof member?.email === "string" ? member.email : null) === userEmail,
        )
      }).length
    : 0

  const impact: DeleteImpact = {
    ownedProjects: Array.isArray(ownedProjects) ? ownedProjects.length : 0,
    ownedTeams: Array.isArray(ownedTeams) ? ownedTeams.length : 0,
    ownedTemplates: Array.isArray(ownedTemplates) ? ownedTemplates.length : 0,
    ownedTokens: Array.isArray(ownedTokens) ? ownedTokens.length : 0,
    teamMemberships,
    projectMemberships,
    hasData: false,
  }
  impact.hasData =
    impact.ownedProjects > 0 ||
    impact.ownedTeams > 0 ||
    impact.ownedTemplates > 0 ||
    impact.ownedTokens > 0 ||
    impact.teamMemberships > 0 ||
    impact.projectMemberships > 0

  return impact
}

async function removeUserCollaborations(
  admin: AdminClient,
  userEmail: string,
) {
  if (!userEmail) return

  const { data: teamRows } = await admin.from("teams").select("id,lead,members")
  if (Array.isArray(teamRows)) {
    for (const team of teamRows) {
      const lead = team.lead && typeof team.lead === "object" ? { ...team.lead } : null
      const members = Array.isArray(team.members) ? [...team.members] : []

      const leadEmail = normalizeEmail(typeof lead?.email === "string" ? lead.email : null)
      const nextLead = leadEmail === userEmail ? null : lead
      const nextMembers = members.filter(
        (member) => normalizeEmail(typeof member?.email === "string" ? member.email : null) !== userEmail,
      )

      const leadChanged = (lead && !nextLead) || (!lead && nextLead) || lead !== nextLead
      const membersChanged = nextMembers.length !== members.length
      if (!leadChanged && !membersChanged) continue

      await admin
        .from("teams")
        .update({ lead: nextLead, members: nextMembers })
        .eq("id", team.id)
    }
  }

  const { data: projectRows } = await admin.from("projects").select("id,extra_members")
  if (Array.isArray(projectRows)) {
    for (const project of projectRows) {
      const members = Array.isArray(project.extra_members) ? [...project.extra_members] : []
      const nextMembers = members.filter(
        (member) => normalizeEmail(typeof member?.email === "string" ? member.email : null) !== userEmail,
      )
      if (nextMembers.length === members.length) continue
      await admin
        .from("projects")
        .update({ extra_members: nextMembers })
        .eq("id", project.id)
    }
  }
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
    const userEmail = normalizeEmail(identity.email)
    const impact = await getDeleteImpact(admin, userId, userEmail)
    return NextResponse.json({ hasData: impact.hasData, impact })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check account data"
    return NextResponse.json({ message }, { status: 500 })
  }
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
    const userEmail = normalizeEmail(identity.email)
    const body = (await request.json().catch(() => null)) as { force?: boolean } | null
    const forceDelete = body?.force === true
    const impact = await getDeleteImpact(admin, userId, userEmail)

    if (impact.hasData && !forceDelete) {
      return NextResponse.json(
        {
          message:
            "Deleting this account will remove your workspace data and revoke access to related teams/projects.",
          hasData: true,
          impact,
        },
        { status: 409 },
      )
    }

    await removeUserCollaborations(admin, userEmail)

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

    return NextResponse.json({ success: true, hadData: impact.hasData })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete account"
    return NextResponse.json({ message }, { status: 500 })
  }
}
