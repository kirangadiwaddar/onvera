import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStoreData } from "@/lib/server/data-store"
import { filterTeamsForIdentity } from "@/lib/auth/access"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function GET(request: Request) {
  const { projects, teams } = await getStoreData({ includeRegisteredEmails: true })
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const visibleTeams = filterTeamsForIdentity(teams, identity)

  const enrichedTeams = visibleTeams.map((team) => ({
    ...team,
    projectsAssigned: projects.filter((project) => project.teamIds.includes(team.id)).length,
  }))

  return NextResponse.json({ teams: enrichedTeams })
}

export async function POST(request: Request) {
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as
    | {
        name?: string
        description?: string
        status?: "active" | "inactive"
      }
    | null

  if (!body?.name) {
    return NextResponse.json({ message: "Invalid team payload" }, { status: 400 })
  }

  const admin = createAdminClient()

  if (!admin) {
    return NextResponse.json({ message: "Supabase is not configured" }, { status: 500 })
  }

  const { teams, templates } = await getStoreData({ bypassCache: true, includeRegisteredEmails: true })
  const baseSlug = slugify(body.name)

  if (!baseSlug) {
    return NextResponse.json({ message: "Invalid team name" }, { status: 400 })
  }

  const existingSlugs = new Set(teams.map((team) => team.slug))
  let slug = baseSlug
  let suffix = 1

  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }

  const insertPayload = {
    slug,
    name: body.name.trim(),
    created_by: identity.userId,
    description: body.description?.trim() ?? "",
    status: body.status ?? "active",
    lead: null,
    members: [],
    created_at: new Date().toISOString(),
  }

  let { error } = await admin.from("teams").insert(insertPayload)

  if (error?.message?.includes("created_by")) {
    return NextResponse.json(
      {
        message:
          "Database schema is missing teams.created_by. Run migration 20260309_owner_scope_projects_teams.sql.",
      },
      { status: 500 },
    )
  }

  // Backward compatibility for older DBs where teams.template_id still exists and is required.
  if (error?.message?.includes("template_id")) {
    const fallbackTemplateId = templates[0]?.id

    if (!fallbackTemplateId) {
      return NextResponse.json({ message: error.message }, { status: 500 })
    }

    const retry = await admin.from("teams").insert({
      ...insertPayload,
      template_id: fallbackTemplateId,
    })

    error = retry.error
  }

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  const { teams: latestTeams, projects } = await getStoreData({ bypassCache: true, includeRegisteredEmails: true })
  const created = latestTeams.find((team) => team.slug === slug)

  if (!created) {
    return NextResponse.json({ message: "Team created but could not be fetched" }, { status: 201 })
  }

  const projectsAssigned = projects.filter((project) => project.teamIds.includes(created.id)).length

  return NextResponse.json({ team: { ...created, projectsAssigned } }, { status: 201 })
}
