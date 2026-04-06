"use client"

import { useQuery } from "@tanstack/react-query"

import { useWorkspaceId } from "@/lib/query/use-workspace-id"
import {
  fetchNotificationsPreview,
  getNotificationsPreviewQueryKey,
  type NotificationsPreviewResponse,
} from "@/lib/query/notifications-query"
export type { NotificationPreviewItem } from "@/lib/query/notifications-query"

export function useNotificationsPreviewQuery({
  userId,
  enabled,
  limit = 10,
}: {
  userId?: string | null
  enabled: boolean
  limit?: number
}) {
  const workspaceId = useWorkspaceId()

  return useQuery<NotificationsPreviewResponse>({
    queryKey: getNotificationsPreviewQueryKey(userId, workspaceId, limit),
    enabled: enabled && Boolean(userId),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    queryFn: () => fetchNotificationsPreview(limit),
  })
}
