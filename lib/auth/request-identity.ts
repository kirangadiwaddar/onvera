import { createClient } from "@supabase/supabase-js"
import type { UserRole } from "@/lib/auth/roles"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizePlan, type PlanId } from "@/lib/billing/plans"

export type RequestIdentity = {
  userId: string
  email: string | null
  role: UserRole | null
  plan: PlanId
}

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

  return {
    userId: user.id,
    email: user.email || null,
    role,
    plan,
  }
}
