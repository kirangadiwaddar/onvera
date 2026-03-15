import type { status } from "@/lib/project-status"
import type { Section } from "@/lib/types"
import type { Team, TeamLead, TeamMember } from "@/types/team"

export type Project = {
  id: number
  title: string
  slug: string
  status: status
  templateId: string
  templateTitle?: string
  templateStructure?: Section[]
  createdAt: string
  avatarSrc?: string
  teamIds: number[]
  memberIds: number[]
  teams?: Team[]
  members?: ProjectMember[]
  extraMembers?: ProjectMember[]
  submissions?: Record<string, unknown>
  updatedAt: string
}

export type ProjectMember = (TeamMember | TeamLead) & {
  isExternal?: boolean
  isLead?: boolean
}
