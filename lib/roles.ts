export type UserRole =
  | "admin"
  | "member"
  | "client"

export const rolePermissions = {
  admin: {
    canSubmit: true,
    canApprove: true,
    canEdit: true,
    canCreateDynamicRows: true,
  },

  member: {
    canSubmit: false,
    canApprove: false,
    canEdit: false,
    canCreateDynamicRows: false,
  },

  client: {
    canSubmit: true,
    canApprove: false,
    canEdit: false,
    canCreateDynamicRows: true,
  },
}