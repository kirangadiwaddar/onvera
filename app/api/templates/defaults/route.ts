import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"
import { canUseDefaultTemplates } from "@/lib/billing/plans"

export async function GET(request: Request) {
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  if (!canUseDefaultTemplates(identity.plan)) {
    return NextResponse.json({ message: "Default templates are not available on your plan." }, { status: 403 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ message: "Supabase admin client unavailable." }, { status: 500 })
  }

  const { data, error } = await admin
    .from("templates")
    .select("id,title,description,icon,badge,structure,template_key,is_default")
    .eq("is_default", true)
    .is("created_by", null)
    .order("title", { ascending: true })

  if (error) {
    if (error.message?.includes("is_default") || error.message?.includes("template_key")) {
      return NextResponse.json(
        {
          message:
            "Database schema is missing templates.is_default or templates.template_key. Run migration 20260315_add_templates_defaults.sql.",
        },
        { status: 500 },
      )
    }
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ templates: data ?? [] })
}
