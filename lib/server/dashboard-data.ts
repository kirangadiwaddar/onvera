import type { RequestIdentity } from "@/lib/auth/request-identity"

export function resolveDashboardWorkspaceId(request: Request, identity: RequestIdentity) {
  const requestedWorkspaceId = request.headers.get("x-workspace-id")?.trim() || null
  if (requestedWorkspaceId && requestedWorkspaceId === identity.userId) {
    return requestedWorkspaceId
  }

  return identity.userId
}
