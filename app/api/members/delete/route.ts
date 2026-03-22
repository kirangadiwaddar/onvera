import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"
import { isAdminRole } from "@/lib/auth/access"

type DeleteMemberRequest = {
  email?: string
}

type SupabaseUser = {
  id: string
  email?: string | null
}

function normalizeEmail(value?: string | null) {
  return (value || "").trim().toLowerCase()
}

async function findUserIdByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  if (!admin) return null
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw new Error(error.message)
    }

    const users = Array.isArray((data as { users?: unknown })?.users)
      ? ((data as { users: SupabaseUser[] }).users ?? [])
      : (Array.isArray(data) ? (data as SupabaseUser[]) : [])

    const match = users.find((user) => normalizeEmail(user.email) === email)
    if (match?.id) return match.id

    const nextPage = (data as { nextPage?: number | null } | null)?.nextPage
    if (!nextPage) break
    page = nextPage
  }

  return null
}

export async function POST(request: Request) {
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  if (!isAdminRole(identity.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as DeleteMemberRequest | null
  const targetEmail = normalizeEmail(body?.email)

  if (!targetEmail) {
    return NextResponse.json({ message: "Email is required" }, { status: 400 })
  }

  if (normalizeEmail(identity.email) === targetEmail) {
    return NextResponse.json({ message: "You cannot delete your own access." }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ message: "Supabase service key is not configured" }, { status: 500 })
  }

  try {
    const userId = await findUserIdByEmail(admin, targetEmail)

    const { data: teams, error: teamsError } = await admin
      .from("teams")
      .select("id, lead, members")

    if (teamsError) {
      throw new Error(teamsError.message)
    }

    let teamsUpdated = 0

    if (Array.isArray(teams)) {
      for (const team of teams) {
        const lead = team.lead as { email?: string | null } | null
        const members = Array.isArray(team.members) ? team.members : []

        const nextLead =
          lead && normalizeEmail(lead.email) === targetEmail ? null : lead
        const nextMembers = members.filter((member: { email?: string | null }) =>
          normalizeEmail(member?.email) !== targetEmail
        )

        const leadChanged = (lead ? normalizeEmail(lead.email) : null) !== (nextLead ? normalizeEmail(nextLead.email) : null)
        const membersChanged = members.length !== nextMembers.length

        if (leadChanged || membersChanged) {
          const { error: updateError } = await admin
            .from("teams")
            .update({ lead: nextLead, members: nextMembers })
            .eq("id", team.id)
          if (updateError) {
            throw new Error(updateError.message)
          }
          teamsUpdated += 1
        }
      }
    }

    const { data: projects, error: projectsError } = await admin
      .from("projects")
      .select("id, extra_members")

    if (projectsError) {
      throw new Error(projectsError.message)
    }

    let projectsUpdated = 0

    if (Array.isArray(projects)) {
      for (const project of projects) {
        const extraMembers = Array.isArray(project.extra_members) ? project.extra_members : []
        const nextExtraMembers = extraMembers.filter((member: { email?: string | null }) =>
          normalizeEmail(member?.email) !== targetEmail
        )

        if (extraMembers.length !== nextExtraMembers.length) {
          const { error: updateError } = await admin
            .from("projects")
            .update({ extra_members: nextExtraMembers })
            .eq("id", project.id)
          if (updateError) {
            throw new Error(updateError.message)
          }
          projectsUpdated += 1
        }
      }
    }

    if (userId) {
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
    }

    return NextResponse.json({
      success: true,
      userDeleted: Boolean(userId),
      teamsUpdated,
      projectsUpdated,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete member access"
    return NextResponse.json({ message }, { status: 500 })
  }
}
