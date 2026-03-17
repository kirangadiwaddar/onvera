import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = typeof body?.email === "string" ? body.email.trim() : ""

    if (!email) {
      return NextResponse.json({ exists: false, error: "Email is required" }, { status: 400 })
    }

    const admin = createAdminClient()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { exists: false, error: "Server is not configured for email checks" },
        { status: 500 }
      )
    }

    // Prefer SDK when available, otherwise fall back to REST.
    if (admin && typeof admin.auth.admin.getUserByEmail === "function") {
      const { data, error } = await admin.auth.admin.getUserByEmail(email)
      if (error) {
        return NextResponse.json({ exists: false, error: error.message }, { status: 500 })
      }
      return NextResponse.json({ exists: !!data?.user })
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    try {
      const url = new URL("/auth/v1/admin/users", supabaseUrl)
      url.searchParams.set("email", email)
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        signal: controller.signal,
      })

      const payload = await response.json().catch(() => null) as { users?: Array<{ email?: string }> } | null
      if (!response.ok) {
        return NextResponse.json(
          { exists: false, error: payload ? JSON.stringify(payload) : "Supabase request failed" },
          { status: 500 }
        )
      }

      const users = Array.isArray(payload?.users) ? payload!.users! : []
      const userExists = users.some((user) => (user.email || "").toLowerCase() === email.toLowerCase())
      return NextResponse.json({ exists: userExists })
    } finally {
      clearTimeout(timeout)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to check email"
    return NextResponse.json({ exists: false, error: message }, { status: 500 })
  }
}
