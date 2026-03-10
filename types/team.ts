export type TeamMember = {
  id: number
  name: string
  role: string
  image: string
  email?: string
  accessToken?: string
  isRegistered?: boolean
  memberType?: "agency" | "freelancer"
  isLead?: boolean
}

export type TeamLead = {
  id: number
  name: string
  role: string
  image: string
  email?: string
  accessToken?: string
  isRegistered?: boolean
  memberType?: "agency" | "freelancer"
  isLead?: boolean
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
}
