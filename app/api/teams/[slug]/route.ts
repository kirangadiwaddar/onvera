import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { attachRelations, getStoreData } from "@/lib/server/data-store"
import { filterTeamsForIdentity } from "@/lib/auth/access"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const { projects, teams, templates } = await getStoreData({ includeRegisteredEmails: true })
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const visibleTeams = filterTeamsForIdentity(teams, identity)
  const team = visibleTeams.find((item) => item.slug === slug)

  if (!team) {
    return NextResponse.json({ message: "Team not found" }, { status: 404 })
  }

  const teamProjects = projects
    .filter((project) => project.teamIds.includes(team.id))
    .map((project) => attachRelations(project, teams, templates, { includeTemplateStructure: false }))

  return NextResponse.json({ team, projects: teamProjects })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { teams } = await getStoreData({ bypassCache: true })
  const currentTeam = teams.find((item) => item.slug === slug)
  if (!currentTeam) {
    return NextResponse.json({ message: "Team not found" }, { status: 404 })
  }
  if (currentTeam.createdBy !== identity.userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as
    | {
        name?: string
        description?: string
        status?: "active" | "inactive"
        lead?: unknown
        members?: unknown[]
      }
    | null

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid team payload" }, { status: 400 })
  }

  const admin = createAdminClient()

  if (!admin) {
    return NextResponse.json({ message: "Supabase is not configured" }, { status: 500 })
  }

  const updatePayload: {
    name?: string
    description?: string
    status?: "active" | "inactive"
    lead?: unknown
    members?: unknown[]
  } = {}

  if (typeof body.name === "string" && body.name.trim()) {
    updatePayload.name = body.name.trim()
  }

  if (typeof body.description === "string") {
    updatePayload.description = body.description.trim()
  }

  if (body.status === "active" || body.status === "inactive") {
    updatePayload.status = body.status
  }

  if (body.lead === null || typeof body.lead === "object") {
    updatePayload.lead = body.lead ?? null
  }

  if (Array.isArray(body.members)) {
    updatePayload.members = body.members
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ message: "No updates provided" }, { status: 400 })
  }

  const { error } = await admin.from("teams").update(updatePayload).eq("slug", slug)

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  const { projects, teams: allTeams, templates } = await getStoreData({ bypassCache: true, includeRegisteredEmails: true })
  const team = allTeams.find((item) => item.slug === slug)

  if (!team) {
    return NextResponse.json({ message: "Team not found" }, { status: 404 })
  }

  const teamProjects = projects
    .filter((project) => project.teamIds.includes(team.id))
    .map((project) => attachRelations(project, allTeams, templates, { includeTemplateStructure: false }))

  return NextResponse.json({ team, projects: teamProjects })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { teams } = await getStoreData({ bypassCache: true })
  const currentTeam = teams.find((item) => item.slug === slug)
  if (!currentTeam) {
    return NextResponse.json({ message: "Team not found" }, { status: 404 })
  }
  if (currentTeam.createdBy !== identity.userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const admin = createAdminClient()

  if (!admin) {
    return NextResponse.json({ message: "Supabase is not configured" }, { status: 500 })
  }

  const { error } = await admin.from("teams").delete().eq("slug", slug)

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
