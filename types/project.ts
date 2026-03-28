import type { status } from "@/lib/project-status"
import type { Section } from "@/lib/types"
import type { Team, TeamLead, TeamMember } from "@/types/team"
import type { PlanId } from "@/lib/billing/plans"

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
  createdBy?: string | null
  plan?: PlanId
  isLocked?: boolean
}

export type ProjectMember = (TeamMember | TeamLead) & {
  isExternal?: boolean
  isLead?: boolean
}
