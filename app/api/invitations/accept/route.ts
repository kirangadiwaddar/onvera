import { NextResponse } from "next/server"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveInviteByToken } from "@/lib/invitations/resolve-invite"

type Member = {
  id?: number
  name?: string
  email?: string
  role?: string
  accessToken?: string
  isLead?: boolean
  isExternal?: boolean
}

function stripAccessToken(member: Member, email?: string | null) {
  const next = { ...member }
  delete next.accessToken
  if (!next.email && email) {
    next.email = email
  }
  return next
}

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() || null
}

export async function POST(request: Request) {
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as { token?: string } | null
  const token = body?.token?.trim()
  if (!token) {
    return NextResponse.json({ message: "Missing invite token" }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ message: "Supabase service key is not configured" }, { status: 500 })
  }

  const invite = await resolveInviteByToken(token)
  if (!invite) {
    return NextResponse.json({ message: "Invite not found or already accepted" }, { status: 404 })
  }

  const inviteEmail = normalizeEmail(invite.member.email)
  const identityEmail = normalizeEmail(identity.email)
  const effectiveEmail = identityEmail || inviteEmail
  if (inviteEmail && identityEmail && inviteEmail !== identityEmail) {
    return NextResponse.json(
      { message: "This invite is linked to a different email address." },
      { status: 403 },
    )
  }

  let alreadyHasAccess = false

  if (invite.contextType === "team") {
    const { data: team } = await admin
      .from("teams")
      .select("lead, members")
      .eq("id", invite.contextId)
      .maybeSingle()

    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 })
    }

    const lead = team.lead as Member | null
    const members = Array.isArray(team.members) ? (team.members as Member[]) : []

    if (effectiveEmail) {
      const leadMatch = lead?.email && normalizeEmail(lead.email) === effectiveEmail
      const memberMatchIndex = members.findIndex(
        (member, index) =>
          normalizeEmail(member.email) === effectiveEmail &&
          !(invite.memberLocation === "team_member" && index === invite.memberIndex),
      )
      alreadyHasAccess = Boolean(
        (leadMatch && invite.memberLocation !== "team_lead") || memberMatchIndex >= 0,
      )
    }

    let nextLead = lead
    if (invite.memberLocation === "team_lead" && lead) {
      nextLead = stripAccessToken(lead, identityEmail)
    }

    const nextMembers =
      invite.memberLocation === "team_member"
        ? members.map((member, index) =>
            index === invite.memberIndex ? stripAccessToken(member, identityEmail) : member,
          )
        : members

    const { error } = await admin
      .from("teams")
      .update({ lead: nextLead, members: nextMembers })
      .eq("id", invite.contextId)

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 })
    }
  } else {
    const { data: project } = await admin
      .from("projects")
      .select("extra_members")
      .eq("id", invite.contextId)
      .maybeSingle()

    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 })
    }

    const members = Array.isArray(project.extra_members)
      ? (project.extra_members as Member[])
      : []

    if (effectiveEmail) {
      const memberMatchIndex = members.findIndex(
        (member, index) =>
          normalizeEmail(member.email) === effectiveEmail &&
          !(invite.memberLocation === "project_member" && index === invite.memberIndex),
      )
      alreadyHasAccess = memberMatchIndex >= 0
    }

    const nextMembers =
      invite.memberLocation === "project_member"
        ? members.map((member, index) =>
            index === invite.memberIndex ? stripAccessToken(member, identityEmail) : member,
          )
        : members

    const { error } = await admin
      .from("projects")
      .update({ extra_members: nextMembers })
      .eq("id", invite.contextId)

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 })
    }
  }

  // Ensure invited members keep the correct role, but don't downgrade team leads.
  if (identity.userId && invite.memberRole) {
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", identity.userId)
      .maybeSingle()

    const currentRole = typeof profile?.role === "string" ? profile.role : null
    const isPrivileged = currentRole === "team_lead" || currentRole === "super_admin"
    if (!isPrivileged && currentRole !== invite.memberRole) {
      await admin
        .from("profiles")
        .upsert({ id: identity.userId, role: invite.memberRole })
    }
  }

  return NextResponse.json({
    accepted: true,
    alreadyHasAccess,
    redirect:
      invite.contextType === "team"
        ? `/teams/${invite.contextSlug}`
        : `/projects/${invite.contextSlug}`,
  })
}
