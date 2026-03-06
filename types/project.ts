import type { status } from "@/lib/project-status"

/* -----------------------------
   PROJECT EXTERNAL MEMBER
----------------------------- */

export type ProjectMember = {
  id: string | number
  name: string
  role?: string
  avatar_src?: string | null
  isExternal?: boolean
}

/* -----------------------------
   TEAM MEMBER (team_members table)
----------------------------- */

export type TeamMember = {
  id: number | string
  name: string
  team_role?: string
  designation?: string
  avatar_src?: string | null
}

/* -----------------------------
   TEAM STRUCTURE
----------------------------- */

export type Team = {
  id: number
  name: string
  members?: TeamMember[]
}

/* -----------------------------
   PROJECT TYPE
----------------------------- */

export type Project = {
  id: number
  slug: string
  title: string
  template_id: string
  status: status
  avatar_src: string | null

  created_at: string
  completed_at: string | null
  updated_at: string | null

  /* MULTIPLE TEAMS */
  teams?: Team[]

  /* EXTERNAL PROJECT MEMBERS */
  members?: ProjectMember[]

  submissions?: Record<string, any>

  template?: {
    id: string
    title: string
  }

  templateTitle?: string

  client_token?: string
client_password?: string | null
client_link_enabled?: boolean
client_link_expires_at?: string | null

custom_sections?: any[]
}