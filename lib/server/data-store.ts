import projectsData from "@/src/mocks/data/projects.json"
import teamsData from "@/src/mocks/data/teams.json"
import templatesData from "@/src/mocks/data/templates.json"
import { templateStructure } from "@/lib/template-structure"
import type { Section } from "@/lib/types"
import { createAdminClient } from "@/lib/supabase/admin"
import type { status } from "@/lib/project-status"

type Member = {
  id: number
  name: string
  role?: string
  image?: string
  email?: string
  accessToken?: string
  memberType?: "agency" | "freelancer"
  isLead?: boolean
  isExternal?: boolean
}

type ProjectRow = {
  id: number
  slug: string
  title: string
  template_id: string
  status: status
  created_at: string
  updated_at?: string | null
  avatar_src?: string | null
  team_ids?: number[] | null
  extra_members?: Member[] | null
  submissions?: Record<string, unknown> | null
  created_by?: string | null
}

type TeamRow = {
  id: number
  name: string
  slug: string
  description: string
  status: "active" | "inactive"
  lead?: Member | null
  members?: Member[] | null
  created_at: string
  created_by?: string | null
}

type Project = {
  id: number
  slug: string
  title: string
  templateId: string
  status: status
  createdAt: string
  updatedAt?: string
  avatarSrc?: string
  teamIds: number[]
  extraMembers?: Member[]
  submissions?: Record<string, unknown>
  createdBy?: string | null
}

type Team = {
  id: number
  name: string
  slug: string
  description: string
  status: "active" | "inactive"
  lead?: Member
  members: Member[]
  createdAt: string
  createdBy?: string | null
}

type Template = {
  id: string
  title: string
  description: string
  icon: string
  badge: string
  structure?: Section[]
  templateKey?: string
  isDefault?: boolean
}

export type StoreData = {
  projects: Project[]
  teams: Team[]
  templates: Template[]
}

const USE_MOCK_DATA = process.env.USE_MOCK_DATA === "true"

function fromMock(): StoreData {
  return {
    projects: (projectsData.projects as unknown as Project[]).map((project) => ({
      ...project,
      teamIds: project.teamIds ?? [],
      extraMembers: project.extraMembers ?? [],
      submissions: project.submissions ?? {},
    })),
    teams: (teamsData.teams as unknown as Team[]).map((team) => ({
      ...team,
      members: team.members ?? [],
    })),
    templates: (templatesData.templates as Template[]).map((template) => ({
      ...template,
      structure: templateStructure[template.id] ?? [],
      templateKey: template.id,
      isDefault: true,
    })),
  }
}

function normalizeProject(row: ProjectRow): Project {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    templateId: row.template_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
    avatarSrc: row.avatar_src ?? undefined,
    teamIds: row.team_ids ?? [],
    extraMembers: row.extra_members ?? [],
    submissions: row.submissions ?? {},
    createdBy: row.created_by ?? null,
  }
}

function normalizeTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    status: row.status,
    lead: row.lead ?? undefined,
    members: row.members ?? [],
    createdAt: row.created_at,
    createdBy: row.created_by ?? null,
  }
}

export async function getStoreData(): Promise<StoreData> {
  if (USE_MOCK_DATA) {
    return fromMock()
  }

  const admin = createAdminClient()

  if (!admin) {
    return {
      projects: [],
      teams: [],
      templates: [],
    }
  }

  const fetchTemplates = async () => {
    const result = await admin.from("templates").select("*").order("title", { ascending: true })
    if (result.error?.message?.toLowerCase().includes("structure")) {
      return admin
        .from("templates")
        .select("id,title,description,icon,badge,created_at,template_key,is_default")
        .order("title", { ascending: true })
    }
    return result
  }

  const [{ data: projects, error: projectsError }, { data: teams, error: teamsError }, { data: templates, error: templatesError }] =
    await Promise.all([
      admin.from("projects").select("*").order("created_at", { ascending: false }),
      admin.from("teams").select("*").order("id", { ascending: true }),
      fetchTemplates(),
    ])

  if (projectsError || teamsError || templatesError || !projects || !teams || !templates) {
    console.error("Supabase data fetch failed:", {
      projectsError: projectsError?.message ?? null,
      teamsError: teamsError?.message ?? null,
      templatesError: templatesError?.message ?? null,
    })
    return {
      projects: [],
      teams: [],
      templates: [],
    }
  }

  const normalizedProjects = (projects as ProjectRow[]).map(normalizeProject)
  const normalizedTeams = (teams as TeamRow[]).map(normalizeTeam)

  const candidateEmails = new Set<string>()

  const collectEmail = (email?: string | null) => {
    if (!email) return
    candidateEmails.add(email.toLowerCase())
  }

  normalizedTeams.forEach((team) => {
    collectEmail(team.lead?.email)
    team.members.forEach((member) => collectEmail(member.email))
  })

  normalizedProjects.forEach((project) => {
    project.extraMembers?.forEach((member) => collectEmail(member.email))
  })

  let registeredEmails: Set<string> | null = null
  if (candidateEmails.size > 0) {
    registeredEmails = new Set<string>()
    let page = 1
    const perPage = 1000

    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
      if (error) {
        console.error("Supabase listUsers failed:", error.message)
        break
      }

      const users = Array.isArray((data as { users?: unknown })?.users)
        ? (data as { users: Array<{ email?: string | null }> }).users
        : Array.isArray(data)
          ? (data as Array<{ email?: string | null }>)
          : []

      users.forEach((user) => {
        const email = user.email?.toLowerCase()
        if (email && candidateEmails.has(email)) {
          registeredEmails!.add(email)
        }
      })

      const nextPage = (data as { nextPage?: number | null } | null)?.nextPage
      if (!nextPage) break
      page = nextPage
    }
  }

  const isRegisteredEmail = (email?: string | null) =>
    !!(registeredEmails && email && registeredEmails.has(email.toLowerCase()))

  const sanitizedTeams = normalizedTeams.map((team) => ({
    ...team,
    lead: team.lead
      ? {
          ...team.lead,
          isRegistered: isRegisteredEmail(team.lead.email),
        }
      : undefined,
    members: team.members.map((member) => ({
      ...member,
      isRegistered: isRegisteredEmail(member.email),
    })),
  }))

  const sanitizedProjects = normalizedProjects.map((project) => ({
    ...project,
    extraMembers: project.extraMembers?.map((member) => ({
      ...member,
      isRegistered: isRegisteredEmail(member.email),
    })),
  }))

  const normalizedTemplates = (templates as Template[]).map((template) => {
    const templateKey =
      (template as Template & { template_key?: string }).template_key ??
      template.templateKey ??
      template.id
    const hasStructureArray =
      Array.isArray(template.structure) && (template.structure as Section[]).length > 0
    return {
      ...template,
      templateKey,
      isDefault:
        typeof (template as Template & { is_default?: boolean }).is_default === "boolean"
          ? (template as Template & { is_default?: boolean }).is_default
          : template.isDefault,
      structure: hasStructureArray
        ? (template.structure as Section[])
        : templateStructure[templateKey] ?? templateStructure[template.id] ?? [],
    }
  })

  return {
    projects: sanitizedProjects,
    teams: sanitizedTeams,
    templates: normalizedTemplates,
  }
}

export function attachRelations(project: Project, teams: Team[], templates: Template[]) {
  const template = templates.find((t) => t.id === project.templateId || t.templateKey === project.templateId)

  const assignedTeams = teams.filter((team) => project.teamIds.includes(team.id))

  const teamMembers = assignedTeams.flatMap((team) => [
    ...(team.lead ? [{ ...team.lead, isLead: true, isExternal: false }] : []),
    ...team.members.map((member) => ({
      ...member,
      isLead: false,
      isExternal: false,
    })),
  ])

  const extraMembers = (project.extraMembers ?? []).map((member) => ({
    ...member,
    isLead: false,
    isExternal: true,
  }))

  const uniqueMembers = Array.from(new Map([...teamMembers, ...extraMembers].map((member) => [member.id, member])).values())

  return {
    ...project,
    templateTitle: template?.title ?? "Unknown",
    templateStructure:
      template?.structure && template.structure.length > 0
        ? template.structure
        : templateStructure[template?.templateKey ?? project.templateId] ??
          templateStructure[project.templateId] ??
          [],
    teams: assignedTeams,
    members: uniqueMembers,
  }
}
