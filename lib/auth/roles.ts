export const USER_ROLES = [
  "super_admin",
  "team_lead",
  "team_member",
  "project_member",
] as const

export type UserRole = (typeof USER_ROLES)[number]

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  team_lead: "Team Lead",
  project_member: "Project Member",
  team_member: "Team Member",
}

export function isUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole)
}

export function isInternalRole(role?: string | null) {
  return (
    role === "super_admin" ||
    role === "team_lead" ||
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
