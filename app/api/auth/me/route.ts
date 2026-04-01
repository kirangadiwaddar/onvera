import { NextResponse } from "next/server"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStoreData } from "@/lib/server/data-store"

const normalizeEmail = (value?: string | null) => (value || "").trim().toLowerCase()

export async function GET(request: Request) {
  try {
    const identity = await getRequestIdentityFromRequest(request)
    if (!identity) {
      return NextResponse.json({ user: null, profile: null }, { status: 200 })
    }

    let fullName: string | null = null
    let role: string | null = identity.role
    const plan: string | null = identity.plan
    let stripeCustomerId: string | null = null
    let stripeSubscriptionId: string | null = null
    const admin = createAdminClient()
    if (admin) {
      const { data: profile } = await admin
        .from("profiles")
        .select("full_name, role, stripe_customer_id, stripe_subscription_id")
        .eq("id", identity.userId)
        .maybeSingle()
      fullName = profile?.full_name ?? null
      role = profile?.role ?? role
      stripeCustomerId = profile?.stripe_customer_id ?? null
      stripeSubscriptionId = profile?.stripe_subscription_id ?? null
    }

    let workspaceRole: string | null = role
    const email = normalizeEmail(identity.email)
    if (email) {
      const { teams, projects } = await getStoreData()
      const isLeadInTeam = teams.some((team) => normalizeEmail(team.lead?.email) === email)
      const isMemberInTeam = teams.some((team) =>
        (team.members || []).some((member) => normalizeEmail(member.email) === email),
      )
      const isLeadInProject = projects.some((project) =>
        (project.extraMembers || []).some(
          (member) =>
            normalizeEmail(member.email) === email &&
            (member.memberType === "team_lead" || member.isLead === true),
        ),
      )
      const isProjectMember = projects.some((project) =>
        (project.extraMembers || []).some((member) => normalizeEmail(member.email) === email),
      )

      if (isLeadInTeam || isLeadInProject) {
        workspaceRole = "team_lead"
      } else if (isMemberInTeam) {
        workspaceRole = "team_member"
      } else if (isProjectMember) {
        workspaceRole = "project_member"
      }
    }

    return NextResponse.json({
      user: {
        id: identity.userId,
        email: identity.email,
        fullName,
      },
          profile: role
        ? {
            id: identity.userId,
            fullName,
            role,
            workspaceRole,
            plan,
            stripeCustomerId,
          stripeSubscriptionId,
        }
      : null,
    })
  } catch {
    return NextResponse.json({ user: null, profile: null }, { status: 200 })
  }
}
