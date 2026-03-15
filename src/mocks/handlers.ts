import { http, HttpResponse } from "msw"
import rawData from "./data/projects.json"
import { status } from "@/lib/project-status"
import teamsData from "@/src/mocks/data/teams.json"
import templatesData from "@/src/mocks/data/templates.json"

/* ================================
   TYPES
================================ */

type Member = {
  id: number
  name: string
  role?: string
  image?: string
}

type Project = {
  id: number
  title: string
  status: status
  templateId: string
  createdAt: string
  slug: string
  teamIds: number[]
  extraMembers?: Member[]   // ✅ FIXED
}

/* ================================
   MOCK DATA
================================ */

const mockTeams = teamsData.teams
const initialData = rawData as { projects: Project[] }
const mockProjects: Project[] = [...initialData.projects]

/* ================================
   RELATION ATTACHER
================================ */

const attachRelations = (project: Project) => {
  const template = templatesData.templates.find(
    (t) => t.id === project.templateId
  )

  const assignedTeams = mockTeams.filter((team) =>
    project.teamIds?.includes(team.id)
  )

  // Collect team members and mark lead
  const teamMembers = assignedTeams.flatMap((team) => [
    ...(team.lead
      ? [{ ...team.lead, isLead: true, isExternal: false }]
      : []),
    ...(team.members || []).map((member) => ({
      ...member,
      isLead: false,
      isExternal: false,
    })),
  ])

  // Mark extra members as external
  const extraMembers = (project.extraMembers || []).map((member) => ({
    ...member,
    isLead: false,
    isExternal: true,
  }))

  const mergedMembers = [...teamMembers, ...extraMembers]

  const uniqueMembers = Array.from(
    new Map(
      mergedMembers.map((member) => [member.id, member])
    ).values()
  )

  return {
    ...project,
    templateTitle: template?.title || "Unknown",
    teams: assignedTeams,
    members: uniqueMembers,
  }
}

/* ================================
   HANDLERS
================================ */

export const handlers = [
  // ================= PROJECT LIST =================
  http.get("/api/projects", () => {
    const enrichedProjects = mockProjects.map(attachRelations)
    return HttpResponse.json({ projects: enrichedProjects })
  }),

  // ================= CREATE PROJECT =================
  http.post("/api/projects", async ({ request }) => {
    const body = (await request.json()) as Omit<Project, "id">

    const newProject: Project = {
      id: Date.now(),
      ...body,
    }

    mockProjects.push(newProject)

    return HttpResponse.json(
      attachRelations(newProject),
      { status: 201 }
    )
  }),

  // ================= PROJECT DETAIL =================
  http.get("/api/projects/:slug", ({ params }) => {
    const { slug } = params

    const project = mockProjects.find(
      (p) => p.slug === slug
    )

    if (!project) {
      return new HttpResponse(null, { status: 404 })
    }

    return HttpResponse.json({
      project: attachRelations(project),
    })
  }),

  // ================= DASHBOARD =================
  http.get("/api/dashboard", () => {
    const total = mockProjects.length

    const completed = mockProjects.filter(p => p.status === "completed")
    const waiting = mockProjects.filter(p => p.status === "waiting")
    const overdue = mockProjects.filter(p => p.status === "overdue")
    const ongoing = mockProjects.filter(p => p.status === "ongoing")

    const latestOngoing = ongoing
      .sort((a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
      )
      .slice(0, 6)
      .map(attachRelations)

    const latestWaitingOverdue = mockProjects
  .filter(p => p.status === "waiting" || p.status === "overdue")
  .sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === "overdue") return -1
      if (b.status === "overdue") return 1
    }

    // 🔥 Oldest date first
    return (
      new Date(a.createdAt).getTime() -
      new Date(b.createdAt).getTime()
    )
  })
  .slice(0, 6)
  .map(attachRelations)

    return HttpResponse.json({
      stats: {
        total,
        completed: completed.length,
        waiting: waiting.length,
        overdue: overdue.length,
        ongoing: ongoing.length,
      },
      charts: {
        completed: completed.length,
        total,
      },
      lists: {
        latestOngoing,
        latestWaitingOverdue,
      },
    })
  }),

  // ================= TEAMS LIST =================
  http.get("/api/teams", () => {
  const enrichedTeams = mockTeams.map((team) => {
    const projectCount = mockProjects.filter((project) =>
      project.teamIds?.includes(team.id)
    ).length

    return {
      ...team,
      projectsAssigned: projectCount,
    }
  })

  return HttpResponse.json({ teams: enrichedTeams })
}),

  // ================= TEAM DETAIL =================
  http.get("/api/teams/:slug", ({ params }) => {
    const { slug } = params

    const team = mockTeams.find(
      (t) => t.slug === slug
    )

    if (!team) {
      return new HttpResponse(null, { status: 404 })
    }

    const teamProjects = mockProjects
      .filter((project) =>
        project.teamIds?.includes(team.id)
      )
      .map(attachRelations)

    return HttpResponse.json({
      team,
      projects: teamProjects,
    })
  }),
]
