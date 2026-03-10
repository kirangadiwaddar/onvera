import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { attachRelations, getStoreData } from "@/lib/server/data-store"
import { filterProjectsForIdentity } from "@/lib/auth/access"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function GET(request: Request) {
  const { projects, teams, templates } = await getStoreData()
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const visibleProjects = filterProjectsForIdentity(projects, teams, identity)
  return NextResponse.json({ projects: visibleProjects.map((project) => attachRelations(project, teams, templates)) })
}

export async function POST(request: Request) {
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as
    | {
        title?: string
        slug?: string
        templateId?: string
        status?: string
        createdAt?: string
        updatedAt?: string
        avatarSrc?: string
        teamIds?: number[]
        extraMembers?: unknown[]
        submissions?: Record<string, unknown>
      }
    | null

  if (!body?.title || !body.templateId) {
    return NextResponse.json({ message: "Invalid project payload" }, { status: 400 })
  }

  const admin = createAdminClient()

  if (!admin) {
    return NextResponse.json({ message: "Supabase is not configured" }, { status: 500 })
  }

  const { projects } = await getStoreData()
  const baseSlug = slugify(body.slug || body.title)

  if (!baseSlug) {
    return NextResponse.json({ message: "Invalid project title" }, { status: 400 })
  }

  const existingSlugs = new Set(projects.map((project) => project.slug))
  let slug = baseSlug
  let suffix = 1

  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }

  const insertPayload = {
    slug,
    title: body.title,
    template_id: body.templateId,
    created_by: identity.userId,
    status: body.status ?? "waiting",
    created_at: body.createdAt ?? new Date().toISOString(),
    updated_at: body.updatedAt ?? new Date().toISOString(),
    avatar_src: body.avatarSrc ?? "",
    team_ids: body.teamIds ?? [],
    extra_members: body.extraMembers ?? [],
    submissions: body.submissions ?? {},
  }

  const { error } = await admin.from("projects").insert(insertPayload)

  if (error) {
    if (error.message?.includes("created_by")) {
      return NextResponse.json(
        {
          message:
            "Database schema is missing projects.created_by. Run migration 20260309_owner_scope_projects_teams.sql.",
        },
        { status: 500 },
      )
    }
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  const { projects: latestProjects, teams, templates } = await getStoreData()
  const project = latestProjects.find((item) => item.slug === slug)

  if (!project) {
    return NextResponse.json({ message: "Project created but could not be fetched" }, { status: 201 })
  }

  return NextResponse.json(attachRelations(project, teams, templates), { status: 201 })
}
