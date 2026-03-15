import type { status } from "@/lib/project-status"
import type { Section } from "@/lib/types"

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
  teams?: any[]
  members?: any[]
  extraMembers?: any[]

  submissions?: Record<string, any>
  updatedAt: string
}
