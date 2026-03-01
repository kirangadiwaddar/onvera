import type { status } from "@/lib/project-status"

export type Project = {
  id: number
  title: string
  slug: string
  status: status
  templateId: string
  templateTitle?: string
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