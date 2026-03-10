export const USER_ROLES = [
  "agency",
  "freelancer",
  "project_member",
  "team_member",
] as const

export type UserRole = (typeof USER_ROLES)[number]

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  agency: "Agency",
  freelancer: "Freelancer",
  project_member: "Project Member",
  team_member: "Team Member",
}

export function isUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole)
}

export function isInternalRole(role?: string | null) {
  return (
    role === "agency" ||
    role === "freelancer" ||
    role === "admin" ||
    role === "team_member" ||
    role === "project_member"
  )
}

export function getDefaultPathForRole(role?: string | null) {
  if (role === "project_member" || role === "team_member") {
    return "/projects"
  }
  return "/dashboard"
}
