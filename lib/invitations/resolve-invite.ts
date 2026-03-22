"use server"

import { createAdminClient } from "@/lib/supabase/admin"

type TeamRow = {
  id: number
  slug: string
  name: string
  lead?: unknown | null
  members?: unknown[] | null
}

type ProjectRow = {
  id: number
  slug: string
  title: string
  extra_members?: unknown[] | null
}

type Member = {
  id?: number
  name?: string
  email?: string
  role?: string
  accessToken?: string
  isLead?: boolean
  isExternal?: boolean
}

export type InviteMatch = {
  contextType: "team" | "project"
  contextId: number
  contextSlug: string
  contextName: string
  memberRole: "team_member" | "project_member"
  member: Member
  memberLocation: "team_lead" | "team_member" | "project_member"
  memberIndex?: number
}

function normalizeMember(value: unknown): Member | null {
  if (!value || typeof value !== "object") return null
  const raw = value as Member
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    role: raw.role,
    accessToken: raw.accessToken,
    isLead: raw.isLead,
    isExternal: raw.isExternal,
  }
}

export async function resolveInviteByToken(token: string): Promise<InviteMatch | null> {
  const trimmed = token.trim()
  if (!trimmed) return null

  const admin = createAdminClient()
  if (!admin) return null

  const { data: teams } = await admin
    .from("teams")
    .select("id, slug, name, lead, members")

  const teamRows = Array.isArray(teams) ? (teams as TeamRow[]) : []
  for (const team of teamRows) {
    const lead = normalizeMember(team.lead)
    if (lead?.accessToken === trimmed) {
      return {
        contextType: "team",
        contextId: team.id,
        contextSlug: team.slug,
        contextName: team.name,
        memberRole: "team_member",
        member: { ...lead, isLead: true },
        memberLocation: "team_lead",
      }
    }

    const members = Array.isArray(team.members) ? team.members : []
    const memberIndex = members.findIndex((member) => normalizeMember(member)?.accessToken === trimmed)
    if (memberIndex >= 0) {
      const member = normalizeMember(members[memberIndex])
      if (member) {
        return {
          contextType: "team",
          contextId: team.id,
          contextSlug: team.slug,
          contextName: team.name,
          memberRole: "team_member",
          member,
          memberLocation: "team_member",
          memberIndex,
        }
      }
    }
  }

  const { data: projects } = await admin
    .from("projects")
    .select("id, slug, title, extra_members")

  const projectRows = Array.isArray(projects) ? (projects as ProjectRow[]) : []
  for (const project of projectRows) {
    const members = Array.isArray(project.extra_members) ? project.extra_members : []
    const memberIndex = members.findIndex((member) => normalizeMember(member)?.accessToken === trimmed)
    if (memberIndex >= 0) {
      const member = normalizeMember(members[memberIndex])
      if (member) {
        return {
          contextType: "project",
          contextId: project.id,
          contextSlug: project.slug,
          contextName: project.title,
          memberRole: "project_member",
          member,
          memberLocation: "project_member",
          memberIndex,
        }
      }
    }
  }

  return null
}
