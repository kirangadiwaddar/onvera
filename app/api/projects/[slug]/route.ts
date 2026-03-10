import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { attachRelations, getStoreData } from "@/lib/server/data-store"
import type { status } from "@/lib/project-status"
import {
  filterProjectsForIdentity,
  isAdminRole,
  isLeadForProject,
} from "@/lib/auth/access"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const { projects, teams, templates } = await getStoreData()
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const visibleProjects = filterProjectsForIdentity(projects, teams, identity)
  const project = visibleProjects.find((item) => item.slug === slug)

  if (!project) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 })
  }

  return NextResponse.json({ project: attachRelations(project, teams, templates) })
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

  const body = (await request.json().catch(() => null)) as
    | {
        title?: string
        templateId?: string
        avatarSrc?: string
        status?: status
        teamIds?: number[]
        extraMembers?: unknown[]
        submissions?: Record<string, unknown>
      }
    | null

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid project payload" }, { status: 400 })
  }

  const { projects, teams } = await getStoreData()
  const currentProject = projects.find((item) => item.slug === slug)

  if (!currentProject) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 })
  }

  const visibleProjects = filterProjectsForIdentity(projects, teams, identity)
  if (!visibleProjects.some((item) => item.slug === slug)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const adminRole = isAdminRole(identity.role)
  const leadAccess = isLeadForProject(currentProject, teams, identity.email)
  const onlySubmissionsUpdate =
    Object.keys(body).length > 0 && Object.keys(body).every((key) => key === "submissions")
  const ownerAccess = currentProject.createdBy === identity.userId

  if (!ownerAccess && !adminRole && (!leadAccess || !onlySubmissionsUpdate)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const admin = createAdminClient()

  if (!admin) {
    return NextResponse.json({ message: "Supabase is not configured" }, { status: 500 })
  }

  const updatePayload: {
    title?: string
    template_id?: string
    avatar_src?: string
    status?: status
    team_ids?: number[]
    extra_members?: unknown[]
    submissions?: Record<string, unknown>
    updated_at: string
  } = {
    updated_at: new Date().toISOString(),
  }

  if (typeof body.title === "string" && body.title.trim()) {
    updatePayload.title = body.title.trim()
  }

  if (typeof body.templateId === "string" && body.templateId.trim()) {
    updatePayload.template_id = body.templateId
  }

  if (typeof body.avatarSrc === "string") {
    updatePayload.avatar_src = body.avatarSrc
  }

  if (typeof body.status === "string") {
    updatePayload.status = body.status
  }

  if (Array.isArray(body.teamIds)) {
    updatePayload.team_ids = body.teamIds
  }

  if (Array.isArray(body.extraMembers)) {
    updatePayload.extra_members = body.extraMembers
  }

  if (body.submissions && typeof body.submissions === "object" && !Array.isArray(body.submissions)) {
    updatePayload.submissions = body.submissions
  }

  const updatableKeys = Object.keys(updatePayload).filter((key) => key !== "updated_at")

  if (updatableKeys.length === 0) {
    return NextResponse.json({ message: "No updates provided" }, { status: 400 })
  }

  const { error } = await admin.from("projects").update(updatePayload).eq("slug", slug)

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  const { projects: refreshedProjects, teams: refreshedTeams, templates } = await getStoreData()
  const updatedProject = refreshedProjects.find((item) => item.slug === slug)

  if (!updatedProject) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 })
  }

  return NextResponse.json({ project: attachRelations(updatedProject, refreshedTeams, templates) })
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

  const { projects } = await getStoreData()
  const currentProject = projects.find((item) => item.slug === slug)
  if (!currentProject) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 })
  }
  if (currentProject.createdBy !== identity.userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const admin = createAdminClient()

  if (!admin) {
    return NextResponse.json({ message: "Supabase is not configured" }, { status: 500 })
  }

  const { error } = await admin.from("projects").delete().eq("slug", slug)

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
