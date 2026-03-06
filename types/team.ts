export type TeamMember = {
  id: number
  team_id: number
  name: string
  email?: string
  team_role: "lead" | "member"
  designation?: string
  avatar_src?: string | null
  is_lead?: boolean
  status?: "active" | "pending"
}

export type Team = {
  id: number
  name: string
  slug: string
  description: string
  template: string
  status: "active" | "inactive"
  created_at: string
  members: TeamMember[]
  projectsAssigned?: number   // ✅ now valid again
}