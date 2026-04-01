import { NextResponse } from "next/server"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ message: "Supabase is not configured" }, { status: 500 })
  }

  const { error } = await admin
    .from("profiles")
    .upsert({ id: identity.userId, role: "super_admin", plan: "free" })

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  await admin.auth.admin.updateUserById(identity.userId, {
    user_metadata: { role: "super_admin" },
  })

  return NextResponse.json({ created: true })
}
