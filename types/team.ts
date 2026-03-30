export type TeamMember = {
  id: number
  name: string
  role: string
  image: string
  email?: string
  accessToken?: string
  isRegistered?: boolean
  memberType?: "team_lead"
  isLead?: boolean
  invitedByEmail?: string
  invitedByRole?: "team_lead" | "super_admin"
}

export type TeamLead = {
  id: number
  name: string
  role: string
  image: string
  email?: string
  accessToken?: string
  isRegistered?: boolean
  memberType?: "team_lead"
  isLead?: boolean
  invitedByEmail?: string
  invitedByRole?: "team_lead" | "super_admin"
}

export type Team = {
  id: number
  name: string
  slug: string
  description: string
  status: "active" | "inactive"
  lead?: TeamLead
  members: TeamMember[]
  projectsAssigned?: number
  createdAt: string
  createdBy?: string | null
}
