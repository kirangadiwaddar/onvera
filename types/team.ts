export type TeamMember = {
  id: number
  name: string
  role: string
  image: string
}

export type TeamLead = {
  id: number
  name: string
  role: string
  image: string
}

export type Team = {
  id: number
  name: string
  slug: string
  description: string
  template: string
  status: "active" | "inactive"
  lead?: TeamLead
  members: TeamMember[]
  projectsAssigned?: number
  createdAt: string
}