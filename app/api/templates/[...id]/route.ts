import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Section } from "@/lib/types"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"

export async function PATCH(request: Request) {
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ message: "Supabase admin client unavailable." }, { status: 500 })
  }

  const body = (await request.json().catch(() => null)) as {
    title?: string
    description?: string
    icon?: string
    badge?: string
    structure?: Section[]
  } | null

  if (!body) {
    return NextResponse.json({ message: "Invalid payload." }, { status: 400 })
  }

  const updatePayload: Record<string, unknown> = {}
  if (typeof body.title === "string") updatePayload.title = body.title
  if (typeof body.description === "string") updatePayload.description = body.description
  if (typeof body.icon === "string") updatePayload.icon = body.icon
  if (typeof body.badge === "string") updatePayload.badge = body.badge
  if (Array.isArray(body.structure)) updatePayload.structure = body.structure
  if (typeof body.title === "string" && body.title.trim()) {
    updatePayload.template_key = body.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ message: "No updates provided." }, { status: 400 })
  }

  const templateId = new URL(request.url).pathname.split("/api/templates/")[1] || ""
  if (!templateId) {
    return NextResponse.json({ message: "Template id is required." }, { status: 400 })
  }
  const decodedId = decodeURIComponent(templateId)
  const { error } = await admin
    .from("templates")
    .update(updatePayload)
    .eq("id", decodedId)
    .eq("created_by", identity.userId)

  if (error) {
    const message = error.message?.toLowerCase() ?? ""
    if (error.code === "23505" || message.includes("templates_user_template_key_unique")) {
      return NextResponse.json(
        { message: "A template with the same key already exists." },
        { status: 409 },
      )
    }
    if (message.includes("created_by") || message.includes("template_key")) {
      return NextResponse.json(
        {
          message:
            "Database schema is missing templates.created_by or templates.template_key. Run migration 20260315_add_templates_defaults.sql.",
        },
        { status: 500 },
      )
    }
    if (updatePayload.structure && message.includes("structure")) {
      // Fallback: try RPC if schema cache is stale for the column.
      const rpc = await admin.rpc("update_template_structure", {
        next_structure: updatePayload.structure,
        template_id: decodedId,
      })
      if (!rpc.error) {
        return NextResponse.json({ id: decodedId }, { status: 200 })
      }
      // As a last resort, ignore structure update if schema cache is stale.
      const fallbackPayload = { ...updatePayload }
      delete fallbackPayload.structure
      if (Object.keys(fallbackPayload).length > 0) {
        const fallback = await admin
          .from("templates")
          .update(fallbackPayload)
          .eq("id", decodedId)
          .eq("created_by", identity.userId)
        if (!fallback.error) {
          return NextResponse.json({ id: decodedId, skippedStructure: true }, { status: 200 })
        }
      }
      return NextResponse.json(
        {
          message:
            "Template structure column is missing or schema cache is stale. Please run the migration or create the update_template_structure RPC.",
          detail: rpc.error?.message ?? null,
        },
        { status: 409 }
      )
    }
    return NextResponse.json({ message: error.message }, { status: 400 })
  }

  return NextResponse.json({ id: decodedId }, { status: 200 })
}

export async function DELETE(_request: Request) {
  const identity = await getRequestIdentityFromRequest(_request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ message: "Supabase admin client unavailable." }, { status: 500 })
  }

  const templateId = new URL(_request.url).pathname.split("/api/templates/")[1] || ""
  if (!templateId) {
    return NextResponse.json({ message: "Template id is required." }, { status: 400 })
  }
  const decodedId = decodeURIComponent(templateId)
  const { error } = await admin
    .from("templates")
    .delete()
    .eq("id", decodedId)
    .eq("created_by", identity.userId)

  if (error) {
    if (error.message?.includes("created_by") || error.message?.includes("template_key")) {
      return NextResponse.json(
        {
          message:
            "Database schema is missing templates.created_by or templates.template_key. Run migration 20260315_add_templates_defaults.sql.",
        },
        { status: 500 },
      )
    }
    return NextResponse.json({ message: error.message }, { status: 400 })
  }

  return NextResponse.json({ id: decodedId }, { status: 200 })
}
