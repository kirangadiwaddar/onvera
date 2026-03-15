import { NextResponse } from "next/server"
import { attachRelations, getStoreData } from "@/lib/server/data-store"
import { filterProjectsForIdentity } from "@/lib/auth/access"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const revalidate = 0

type ActivityItem = {
  id: string
  title: string
  project: string
  status: string
  actor: "Admin" | "Client" | "Team Lead"
  timestamp: string
}

type SubmissionValue = {
  value?: string
  status?: string
  submittedAt?: string
}

type DynamicRow = {
  name?: string
  url?: string
  status?: string
  submittedAt?: string
}

function formatLabel(value: string) {
  return value
    .replace(/^custom-/, "")
    .replace(/[_-]+/g, " ")
    .trim()
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limitRaw = Number(searchParams.get("limit") ?? "50")
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50
  const { projects, teams, templates } = await getStoreData()
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const visibleProjects = filterProjectsForIdentity(projects, teams, identity)

  const completed = visibleProjects.filter((project) => project.status === "completed")
  const waiting = visibleProjects.filter((project) => project.status === "waiting")
  const overdue = visibleProjects.filter((project) => project.status === "overdue")
  const ongoing = visibleProjects.filter((project) => project.status === "ongoing")

  const latestOngoing = [...ongoing]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)
    .map((project) => attachRelations(project, teams, templates))

  const latestWaitingOverdue = [...visibleProjects]
    .filter((project) => project.status === "waiting" || project.status === "overdue")
    .sort((a, b) => {
      if (a.status !== b.status) {
        if (a.status === "overdue") return -1
        if (b.status === "overdue") return 1
      }

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
    .slice(0, 6)
    .map((project) => attachRelations(project, teams, templates))

  const activities: ActivityItem[] = []

  visibleProjects.forEach((project) => {
    activities.push({
      id: `${project.slug}-created`,
      title: "Project created",
      project: project.title,
      status: "created",
      actor: "Admin",
      timestamp: project.createdAt,
    })

    if (project.updatedAt && new Date(project.updatedAt).getTime() > new Date(project.createdAt).getTime()) {
      activities.push({
        id: `${project.slug}-status-${project.updatedAt}`,
        title: `Project status is ${project.status}`,
        project: project.title,
        status: project.status,
        actor: "Admin",
        timestamp: project.updatedAt,
      })
    }

    const submissions = (project.submissions || {}) as Record<string, unknown>
    Object.entries(submissions).forEach(([key, raw]) => {
      if (key === "__custom_sections") return

      if (Array.isArray(raw)) {
        raw.forEach((row, index) => {
          if (!row || typeof row !== "object") return
          const dynamic = row as DynamicRow
          if (!dynamic.submittedAt) return
          const status = dynamic.status || "submitted"
          const label = formatLabel(dynamic.name || key || `row-${index + 1}`)
          const actor = status === "submitted" ? "Client" : "Team Lead"
          const title =
            status === "approved"
              ? `${label} approved`
              : status === "rejected"
                ? `${label} rejected`
                : `${label} submitted`
          activities.push({
            id: `${project.slug}-${key}-${index}-${dynamic.submittedAt}-${status}`,
            title,
            project: project.title,
            status,
            actor,
            timestamp: dynamic.submittedAt,
          })
        })
        return
      }

      if (!raw || typeof raw !== "object") return
      const value = raw as SubmissionValue
      if (!value.submittedAt) return
      const status = value.status || "submitted"
      const label = formatLabel(key)
      const actor = status === "submitted" ? "Client" : "Team Lead"
      const title =
        status === "approved"
          ? `${label} approved`
          : status === "rejected"
            ? `${label} rejected`
            : `${label} submitted`
      activities.push({
        id: `${project.slug}-${key}-${value.submittedAt}-${status}`,
        title,
        project: project.title,
        status,
        actor,
        timestamp: value.submittedAt,
      })
    })
  })

  const admin = createAdminClient()
  if (admin && visibleProjects.length > 0) {
    const slugs = visibleProjects.map((project) => project.slug)
    const { data } = await admin
      .from("onboarding_tokens")
      .select("token, project_slug, created_at")
      .in("project_slug", slugs)
      .order("created_at", { ascending: false })
      .limit(30)

    if (Array.isArray(data)) {
      data.forEach((row) => {
        const project = visibleProjects.find((item) => item.slug === row.project_slug)
        if (!project) return
        activities.push({
          id: `onboarding-${row.token}`,
          title: "Client access link generated",
          project: project.title,
          status: "generated",
          actor: "Admin",
          timestamp: row.created_at,
        })
      })
    }
  }

  const recentActivities = activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)

  return NextResponse.json({
    stats: {
      total: visibleProjects.length,
      completed: completed.length,
      waiting: waiting.length,
      overdue: overdue.length,
      ongoing: ongoing.length,
    },
    charts: {
      completed: completed.length,
      total: visibleProjects.length,
    },
    lists: {
      latestOngoing,
      latestWaitingOverdue,
    },
    activities: recentActivities,
  })
}
