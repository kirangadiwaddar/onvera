import { NextResponse } from "next/server"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  try {
    const identity = await getRequestIdentityFromRequest(request)
    if (!identity) {
      return NextResponse.json({ user: null, profile: null }, { status: 200 })
    }

    let fullName: string | null = null
    let role: string | null = identity.role
    let plan: string | null = identity.plan
    let stripeCustomerId: string | null = null
    let stripeSubscriptionId: string | null = null
    const admin = createAdminClient()
    if (admin) {
      const { data: profile } = await admin
        .from("profiles")
        .select("full_name, role, plan, stripe_customer_id, stripe_subscription_id")
        .eq("id", identity.userId)
        .maybeSingle()
      fullName = profile?.full_name ?? null
      role = profile?.role ?? role
      plan = profile?.plan ?? plan
      stripeCustomerId = profile?.stripe_customer_id ?? null
      stripeSubscriptionId = profile?.stripe_subscription_id ?? null
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
