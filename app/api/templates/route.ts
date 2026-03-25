import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Section } from "@/lib/types"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"
import { randomUUID } from "crypto"

export async function GET(request: Request) {
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ message: "Supabase admin client unavailable." }, { status: 500 })
  }

  const { data: templates, error: templatesError } = await admin
    .from("templates")
    .select("*")
    .eq("created_by", identity.userId)
    .or("is_default.is.null,is_default.eq.false")
    .order("title", { ascending: true })

  if (templatesError) {
    if (templatesError.message?.includes("created_by")) {
      return NextResponse.json(
        {
          message:
            "Database schema is missing templates.created_by. Run migration to scope templates per user.",
        },
        { status: 500 },
      )
    }
    return NextResponse.json({ message: templatesError.message }, { status: 500 })
  }

  const { data: projects, error: projectsError } = await admin
    .from("projects")
    .select("template_id")
    .eq("created_by", identity.userId)

  if (projectsError) {
    return NextResponse.json({ message: projectsError.message }, { status: 500 })
  }

  const projectCountMap = (projects || []).reduce((acc: Record<string, number>, project) => {
    const templateId = (project as { template_id?: string | null }).template_id
    if (templateId) {
      acc[templateId] = (acc[templateId] ?? 0) + 1
    }
    return acc
  }, {})

  const payload = (templates || []).map((template) => ({
    ...template,
    projectsCreated: projectCountMap[template.id] ?? 0,
  }))

  return NextResponse.json({ templates: payload })
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

export async function POST(request: Request) {
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
    templateKey?: string
  } | null

  if (!body?.title || !body?.description) {
    return NextResponse.json({ message: "Missing required template fields." }, { status: 400 })
  }

  const baseId = randomUUID()
  const structure = Array.isArray(body.structure) ? body.structure : []
  const icon = typeof body.icon === "string" && body.icon.trim() ? body.icon : "Globe"
  const badge = typeof body.badge === "string" && body.badge.trim() ? body.badge : "Custom"
  const templateKey =
    typeof body.templateKey === "string" && body.templateKey.trim()
      ? body.templateKey.trim()
      : slugify(body.title)

  const { error } = await admin
    .from("templates")
    .insert({
      id: baseId,
      title: body.title,
      description: body.description,
      icon,
      badge,
      structure,
      created_by: identity.userId,
      template_key: templateKey,
      is_default: false,
    })

  if (error) {
    if (error.code === "23505" || error.message?.includes("templates_user_template_key_unique")) {
      return NextResponse.json(
        { message: "A template with the same key already exists." },
        { status: 409 },
      )
    }
    if (error.message?.includes("created_by")) {
      return NextResponse.json(
        {
          message:
            "Database schema is missing templates.created_by. Run migration to scope templates per user.",
        },
        { status: 500 },
      )
    }
    if (error.message?.includes("template_key")) {
      return NextResponse.json(
        {
          message:
            "Database schema is missing templates.template_key. Run migration 20260315_add_templates_defaults.sql.",
        },
        { status: 500 },
      )
    }
    if (error.message?.includes("is_default")) {
      return NextResponse.json(
        {
          message:
            "Database schema is missing templates.is_default. Run migration 20260315_add_templates_defaults.sql.",
        },
        { status: 500 },
      )
    }
    return NextResponse.json({ message: error.message }, { status: 400 })
  }

  return NextResponse.json({ id: baseId }, { status: 201 })
}
