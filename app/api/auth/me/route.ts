import { NextResponse } from "next/server"
import { getRequestIdentityFromRequestWithOptions } from "@/lib/auth/request-identity"
import { createAdminClient } from "@/lib/supabase/admin"

type AuthMePayload = {
  user: { id: string; email: string | null; fullName: string | null } | null
  profile:
    | {
        id: string
        fullName: string | null
        role: string | null
        workspaceRole: string | null
        plan: string | null
        stripeCustomerId: string | null
        stripeSubscriptionId: string | null
      }
    | null
}

type AuthMeCacheEntry = {
  expiresAt: number
  payload: AuthMePayload
}

const AUTH_ME_CACHE_TTL_MS = 8_000
const authMeCache = new Map<string, AuthMeCacheEntry>()

export async function GET(request: Request) {
  try {
    const identity = await getRequestIdentityFromRequestWithOptions(request, {
      includeProfileLookup: false,
    })
    if (!identity) {
      return NextResponse.json({ user: null, profile: null }, { status: 200 })
    }
    const workspaceId = request.headers.get("x-workspace-id")?.trim() || "-"
    const cacheKey = `me:${identity.userId}:${identity.role ?? ""}:${identity.plan}:${workspaceId}`
    const cached = authMeCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.payload)
    }
    if (cached) {
      authMeCache.delete(cacheKey)
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

    const workspaceRole: string | null = identity.role

    const payload: AuthMePayload = {
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
    }
    authMeCache.set(cacheKey, { payload, expiresAt: Date.now() + AUTH_ME_CACHE_TTL_MS })
    return NextResponse.json(payload)
  } catch {
    return NextResponse.json({ user: null, profile: null }, { status: 200 })
  }
}
