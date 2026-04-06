import { NextResponse } from "next/server"
import { attachRelations, getStoreData } from "@/lib/server/data-store"
import { createAdminClient } from "@/lib/supabase/admin"
import type { status } from "@/lib/project-status"
import { createProjectActivityNotifications, findUserEmailById } from "@/lib/server/notifications"

type TokenRow = {
  token: string
  project_slug: string
  expires_at: string | null
  revoked: boolean
  used_count: number | null
  max_uses: number | null
}

function getInvalidReason(row: TokenRow) {
  const now = Date.now()
  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : null
  const isExpired = expiresAt !== null && expiresAt < now
  const maxUses = row.max_uses ?? 1000
  const usedCount = row.used_count ?? 0
  const usageExceeded = usedCount >= maxUses

  if (row.revoked) return "revoked"
  if (isExpired) return "expired"
  if (usageExceeded) return "used_up"
  return null
}

async function validateToken(token: string, slug: string) {
  const admin = createAdminClient()
  if (!admin) {
    return {
      errorResponse: NextResponse.json({ message: "Supabase service key is not configured" }, { status: 500 }),
      admin: null,
    }
  }

  const { data, error } = await admin
    .from("onboarding_tokens")
    .select("token, project_slug, expires_at, revoked, used_count, max_uses")
    .eq("token", token)
    .eq("project_slug", slug)
    .maybeSingle()

  if (error || !data) {
    return {
      errorResponse: NextResponse.json({ message: "Invalid onboarding link" }, { status: 401 }),
      admin,
    }
  }

  const reason = getInvalidReason(data as TokenRow)
  if (reason) {
    return {
      errorResponse: NextResponse.json(
        { message: "This onboarding link is no longer active" },
        { status: 401 },
      ),
      admin,
    }
  }

  return { errorResponse: null, admin }
}

function hasChecklistActivity(submissions?: Record<string, unknown>) {
  if (!submissions || typeof submissions !== "object") return false

  return Object.entries(submissions).some(([key, raw]) => {
    if (key.startsWith("__section_complete:")) {
      return raw === true
    }
    if (Array.isArray(raw)) {
      return raw.some((row) => {
        if (!row || typeof row !== "object") return false
        const entry = row as { name?: unknown; url?: unknown; submittedAt?: unknown; status?: unknown }
        return Boolean(
          (typeof entry.name === "string" && entry.name.trim()) ||
          (typeof entry.url === "string" && entry.url.trim()) ||
          entry.submittedAt ||
          entry.status,
        )
      })
    }
    if (!raw || typeof raw !== "object") return false
    const entry = raw as { value?: unknown; submittedAt?: unknown; status?: unknown }
    if (typeof entry.value === "string" && entry.value.trim()) return true
    if (entry.value !== undefined && entry.value !== null) return true
    return Boolean(entry.submittedAt || entry.status)
  })
}

function hasIncompleteSections(submissions?: Record<string, unknown>) {
  if (!submissions || typeof submissions !== "object") return false
  return Object.entries(submissions).some(([key, raw]) => {
    if (!key.startsWith("__section_complete:")) return false
    return raw === false
  })
}

function countChecklistEntries(submissions?: Record<string, unknown>) {
  if (!submissions || typeof submissions !== "object") return 0
  let count = 0

  Object.entries(submissions).forEach(([key, raw]) => {
    if (key.startsWith("__")) return

    if (Array.isArray(raw)) {
      raw.forEach((row) => {
        if (!row || typeof row !== "object") return
        const entry = row as { name?: unknown; url?: unknown; value?: unknown }
        const hasName = typeof entry.name === "string" && entry.name.trim().length > 0
        const hasUrl = typeof entry.url === "string" && entry.url.trim().length > 0
        const hasValue = typeof entry.value === "string" && entry.value.trim().length > 0
        if (hasName || hasUrl || hasValue) count += 1
      })
      return
    }

    if (!raw || typeof raw !== "object") return
    const entry = raw as { value?: unknown }
    if (typeof entry.value === "string" && entry.value.trim().length > 0) {
      count += 1
    }
  })

  return count
}

function getNewlyCompletedSectionIds(
  beforeSubmissions?: Record<string, unknown>,
  afterSubmissions?: Record<string, unknown>,
) {
  if (!afterSubmissions || typeof afterSubmissions !== "object") return []
  const before = beforeSubmissions && typeof beforeSubmissions === "object" ? beforeSubmissions : {}
  const completed: string[] = []

  Object.entries(afterSubmissions).forEach(([key, raw]) => {
    if (!key.startsWith("__section_complete:")) return
    if (raw !== true) return
    const wasCompleted = (before as Record<string, unknown>)[key] === true
    if (wasCompleted) return
    const sectionId = key.replace("__section_complete:", "").trim()
    completed.push(sectionId || key)
  })

  return completed
}

function stripSubmissionNotificationMeta(submissions?: Record<string, unknown>) {
  if (!submissions || typeof submissions !== "object") return {}
  return Object.fromEntries(
    Object.entries(submissions).filter(([key]) => key !== "__last_client_update"),
  )
}

function hasMeaningfulSubmissionChange(
  beforeSubmissions?: Record<string, unknown>,
  afterSubmissions?: Record<string, unknown>,
) {
  return JSON.stringify(stripSubmissionNotificationMeta(beforeSubmissions)) !==
    JSON.stringify(stripSubmissionNotificationMeta(afterSubmissions))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get("slug")?.trim()
  const token = searchParams.get("token")?.trim()
  const requireToken = process.env.NEXT_PUBLIC_REQUIRE_ONBOARDING_TOKEN !== "false"

  if (!slug) {
    return NextResponse.json({ message: "Missing slug" }, { status: 400 })
  }

  if (requireToken) {
    if (!token) {
      return NextResponse.json({ message: "Missing onboarding token" }, { status: 401 })
    }
    const { errorResponse } = await validateToken(token, slug)
    if (errorResponse) return errorResponse
  }

  const { projects, teams, templates } = await getStoreData()
  const project = projects.find((item) => item.slug === slug)
  if (!project) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 })
  }

  return NextResponse.json({ project: attachRelations(project, teams, templates) })
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { slug?: string; token?: string; submissions?: Record<string, unknown> }
    | null

  const slug = body?.slug?.trim()
  const token = body?.token?.trim()
  const submissions = body?.submissions
  const requireToken = process.env.NEXT_PUBLIC_REQUIRE_ONBOARDING_TOKEN !== "false"

  if (!slug) {
    return NextResponse.json({ message: "Missing slug" }, { status: 400 })
  }

  if (requireToken) {
    if (!token) {
      return NextResponse.json({ message: "Missing onboarding token" }, { status: 401 })
    }
    const { errorResponse } = await validateToken(token, slug)
    if (errorResponse) return errorResponse
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ message: "Supabase service key is not configured" }, { status: 500 })
  }

  if (!submissions || typeof submissions !== "object" || Array.isArray(submissions)) {
    return NextResponse.json({ message: "Invalid submissions payload" }, { status: 400 })
  }

  const { projects } = await getStoreData({
    bypassCache: true,
    includeTeams: false,
    includeTemplates: false,
  })
  const currentProject = projects.find((item) => item.slug === slug)
  if (!currentProject) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 })
  }

  const updatePayload: {
    submissions?: Record<string, unknown>
    status?: status
    updated_at: string
  } = {
    updated_at: new Date().toISOString(),
    submissions: {
      ...submissions,
      __last_client_update: new Date().toISOString(),
    },
  }

  if (hasIncompleteSections(submissions)) {
    updatePayload.status = "ongoing"
  } else if (currentProject.status === "waiting" || currentProject.status === "overdue") {
    if (hasChecklistActivity(submissions)) {
      updatePayload.status = "ongoing"
    }
  }

  const { error } = await admin.from("projects").update(updatePayload).eq("slug", slug)
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
  const { projects: refreshedProjects, teams, templates } = await getStoreData({ bypassCache: true })
  const updatedProject = refreshedProjects.find((item) => item.slug === slug)
  if (!updatedProject) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 })
  }

  if (currentProject.createdBy && hasMeaningfulSubmissionChange(currentProject.submissions, submissions)) {
    const addedItems = Math.max(0, countChecklistEntries(submissions) - countChecklistEntries(currentProject.submissions))
    const newlyCompletedSections = getNewlyCompletedSectionIds(currentProject.submissions, submissions)
    const ownerEmail = await findUserEmailById(admin, currentProject.createdBy)
    const teamRows = currentProject.teamIds.length > 0
      ? await admin
          .from("teams")
          .select("lead,members")
          .in("id", currentProject.teamIds)
          .then((result) => result.data || [])
      : []
    const summaryParts: string[] = []
    if (addedItems > 0) {
      summaryParts.push(`${addedItems} new item${addedItems > 1 ? "s" : ""} added`)
    }
    if (newlyCompletedSections.length > 0) {
      summaryParts.push(`${newlyCompletedSections.length} section${newlyCompletedSections.length > 1 ? "s" : ""} completed`)
    }

    await createProjectActivityNotifications({
      admin,
      ownerId: currentProject.createdBy,
      ownerEmail,
      actorName: "Client",
      actor: "Client",
      projectId: currentProject.id,
      projectSlug: currentProject.slug,
      projectTitle: currentProject.title,
      teamRows,
      extraMembers: currentProject.extraMembers,
      type: "project_update",
      title: `Client updated project ${currentProject.title}`,
      message: summaryParts.join(" • ") || "Checklist updated",
      status: newlyCompletedSections.length > 0 && addedItems === 0 ? "completed" : "updated",
      metadata: {
        addedItems,
        completedSections: newlyCompletedSections,
        source: "onboarding",
      },
      createdBy: null,
    })
  }

  return NextResponse.json({ project: attachRelations(updatedProject, teams, templates) })
}
