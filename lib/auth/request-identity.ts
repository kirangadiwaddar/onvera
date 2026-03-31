import { createClient } from "@supabase/supabase-js"
import type { UserRole } from "@/lib/auth/roles"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizePlan, type PlanId } from "@/lib/billing/plans"
import { getStoreData } from "@/lib/server/data-store"

export type RequestIdentity = {
  userId: string
  email: string | null
  role: UserRole | null
  plan: PlanId
}

const normalizeEmail = (value?: string | null) => (value || "").trim().toLowerCase()

function getBearerToken(request: Request) {
  const auth = request.headers.get("authorization") || ""
  if (!auth.toLowerCase().startsWith("bearer ")) return null
  return auth.slice(7).trim()
}

export async function getRequestIdentityFromRequest(request: Request): Promise<RequestIdentity | null> {
  const token = getBearerToken(request)
  if (!token) return null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser(token)

  if (!user) return null

  let role = (user.user_metadata?.role || null) as UserRole | null
  let plan = normalizePlan(
    typeof user.user_metadata?.plan === "string" ? user.user_metadata.plan : null,
  )

  const admin = createAdminClient()
  if (admin) {
    const { data: profile } = await admin
      .from("profiles")
      .select("role, plan")
      .eq("id", user.id)
      .maybeSingle()
    role = (profile?.role || role || null) as UserRole | null
    plan = normalizePlan(profile?.plan ?? plan)
  }

  const workspaceIdRaw = request.headers.get("x-workspace-id")?.trim() || null
  const workspaceId = workspaceIdRaw && workspaceIdRaw !== "__create__" ? workspaceIdRaw : null
  if (workspaceId && admin) {
    const { teams, projects } = await getStoreData()
    const email = normalizeEmail(user.email)
    const isOwner = user.id === workspaceId
    const isLead = teams.some(
      (team) => team.createdBy === workspaceId && normalizeEmail(team.lead?.email) === email,
    )
    const isTeamMember = teams.some(
      (team) =>
        team.createdBy === workspaceId &&
        (team.members || []).some((member) => normalizeEmail(member.email) === email),
    )
    const isProjectMember = projects.some(
      (project) =>
        project.createdBy === workspaceId &&
        (project.extraMembers || []).some((member) => normalizeEmail(member.email) === email),
    )

    if (isOwner || isLead || isTeamMember || isProjectMember) {
      const { data: ownerProfile } = await admin
        .from("profiles")
        .select("plan")
        .eq("id", workspaceId)
        .maybeSingle()
      plan = normalizePlan(ownerProfile?.plan ?? plan)

      if (isOwner) {
        role = "super_admin"
      } else if (isLead) {
        role = "team_lead"
      } else if (isTeamMember) {
        role = "team_member"
      } else if (isProjectMember) {
        role = "project_member"
      }
    }
  }

  return {
    userId: user.id,
    email: user.email || null,
    role,
    plan,
  }
}
