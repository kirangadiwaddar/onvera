import type { createAdminClient } from "@/lib/supabase/admin"
import { normalizePlan, type PlanId } from "@/lib/billing/plans"

export async function getPlanForUserId(
  admin: ReturnType<typeof createAdminClient>,
  userId?: string | null,
): Promise<PlanId> {
  if (!admin || !userId) return "free"
  const { data } = await admin
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle()
  return normalizePlan((data as { plan?: string | null } | null)?.plan ?? null)
}
