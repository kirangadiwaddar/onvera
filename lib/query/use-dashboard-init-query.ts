"use client"

import { useQuery } from "@tanstack/react-query"

import { useWorkspaceId } from "@/lib/query/use-workspace-id"
import {
  fetchDashboardCounts,
  fetchDashboardData,
  fetchDashboardProjectsSummary,
  fetchDashboardRecentActivity,
  getDashboardCountsQueryKey,
  getDashboardQueryKey,
  getDashboardProjectsSummaryQueryKey,
  getDashboardRecentActivityQueryKey,
  type DashboardResponse,
  type DashboardCountsResponse,
  type DashboardProjectsSummaryResponse,
  type DashboardRecentActivityResponse,
} from "@/lib/query/dashboard-query"

export function useDashboardInitQuery({
  userId,
  enabled,
  limit = 50,
}: {
  userId?: string | null
  enabled: boolean
  limit?: number
}) {
  const workspaceId = useWorkspaceId()

  return useQuery<DashboardResponse>({
    queryKey: getDashboardQueryKey(userId, workspaceId, limit),
    enabled: enabled && Boolean(userId),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    queryFn: () => fetchDashboardData(limit),
  })
}

export function useDashboardCountsQuery({
  userId,
  enabled,
}: {
  userId?: string | null
  enabled: boolean
}) {
  const workspaceId = useWorkspaceId()

  return useQuery<DashboardCountsResponse>({
    queryKey: getDashboardCountsQueryKey(userId, workspaceId),
    enabled: enabled && Boolean(userId),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    queryFn: fetchDashboardCounts,
  })
}

export function useDashboardProjectsSummaryQuery({
  userId,
  enabled,
}: {
  userId?: string | null
  enabled: boolean
}) {
  const workspaceId = useWorkspaceId()

  return useQuery<DashboardProjectsSummaryResponse>({
    queryKey: getDashboardProjectsSummaryQueryKey(userId, workspaceId),
    enabled: enabled && Boolean(userId),
    staleTime: 45_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    queryFn: fetchDashboardProjectsSummary,
  })
}

export function useDashboardRecentActivityQuery({
  userId,
  enabled,
  limit = 12,
}: {
  userId?: string | null
  enabled: boolean
  limit?: number
}) {
  const workspaceId = useWorkspaceId()

  return useQuery<DashboardRecentActivityResponse>({
    queryKey: getDashboardRecentActivityQueryKey(userId, workspaceId, limit),
    enabled: enabled && Boolean(userId),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    queryFn: () => fetchDashboardRecentActivity(limit),
  })
}
