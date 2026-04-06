"use client"

import type { QueryClient } from "@tanstack/react-query"

import { fetchWithAuth } from "@/lib/auth/client-fetch"

export type NotificationPreviewItem = {
  id: string
  title: string
  project?: string | { title?: string }
  status: string
  actor?: "Admin" | "Client" | "Team Lead"
  created_at?: string
  is_read?: boolean
}

export type NotificationsPreviewResponse = {
  activities: NotificationPreviewItem[]
  unreadCount: number
}

export function getNotificationsPreviewQueryKey(userId?: string | null, workspaceId?: string | null, limit = 10) {
  return ["notifications-preview", userId ?? "anonymous", workspaceId ?? "no-workspace", limit] as const
}

export async function fetchNotificationsPreview(limit = 10): Promise<NotificationsPreviewResponse> {
  const res = await fetchWithAuth(`/api/notifications?limit=${limit}`, { cache: "no-store" })
  const payload = (await res.json().catch(() => null)) as NotificationsPreviewResponse | { message?: string } | null

  if (!res.ok) {
    throw new Error(payload && "message" in payload ? payload.message || "Failed to load notifications" : "Failed to load notifications")
  }

  return {
    activities: Array.isArray((payload as NotificationsPreviewResponse | null)?.activities)
      ? (payload as NotificationsPreviewResponse).activities
      : [],
    unreadCount:
      typeof (payload as NotificationsPreviewResponse | null)?.unreadCount === "number"
        ? (payload as NotificationsPreviewResponse).unreadCount
        : 0,
  }
}

export async function prefetchNotificationsPreview(
  queryClient: QueryClient,
  {
    userId,
    workspaceId,
    limit = 10,
  }: {
    userId?: string | null
    workspaceId?: string | null
    limit?: number
  },
) {
  if (!userId) return
  await queryClient.prefetchQuery({
    queryKey: getNotificationsPreviewQueryKey(userId, workspaceId, limit),
    queryFn: () => fetchNotificationsPreview(limit),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  })
}
