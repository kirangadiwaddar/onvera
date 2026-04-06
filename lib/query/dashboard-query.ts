"use client"

import type { QueryClient } from "@tanstack/react-query"

import { fetchWithAuth } from "@/lib/auth/client-fetch"
import type { Project } from "@/types/project"

export type DashboardResponse = {
  stats: {
    total: number
    waiting: number
    completed: number
    overdue: number
  }
  lists: {
    latestWaitingOverdue: Project[]
  }
  activities?: {
    id: string
    title: string
    project: string
    status: string
    actor?: "Admin" | "Client" | "Team Lead"
    timestamp?: string
  }[]
}

export type DashboardCountsResponse = {
  stats?: DashboardResponse["stats"] & { ongoing?: number }
}

export type DashboardProjectsSummaryResponse = {
  lists?: DashboardResponse["lists"]
}

export type DashboardRecentActivityResponse = {
  activities?: DashboardResponse["activities"]
}

function hasDashboardStats(payload: DashboardCountsResponse | { message?: string } | null): payload is DashboardCountsResponse {
  return Boolean(payload && typeof payload === "object" && "stats" in payload)
}

function hasDashboardLists(payload: DashboardProjectsSummaryResponse | { message?: string } | null): payload is DashboardProjectsSummaryResponse {
  return Boolean(payload && typeof payload === "object" && "lists" in payload)
}

function hasDashboardActivities(payload: DashboardRecentActivityResponse | { message?: string } | null): payload is DashboardRecentActivityResponse {
  return Boolean(payload && typeof payload === "object" && "activities" in payload)
}

export function getDashboardQueryKey(userId?: string | null, workspaceId?: string | null, limit = 50) {
  return ["dashboard-init", "dashboard", userId ?? "anonymous", workspaceId ?? "no-workspace", limit] as const
}

export function getDashboardCountsQueryKey(userId?: string | null, workspaceId?: string | null) {
  return ["dashboard-counts", userId ?? "anonymous", workspaceId ?? "no-workspace"] as const
}

export function getDashboardProjectsSummaryQueryKey(userId?: string | null, workspaceId?: string | null) {
  return ["dashboard-projects-summary", userId ?? "anonymous", workspaceId ?? "no-workspace"] as const
}

export function getDashboardRecentActivityQueryKey(userId?: string | null, workspaceId?: string | null, limit = 12) {
  return ["dashboard-recent-activity", userId ?? "anonymous", workspaceId ?? "no-workspace", limit] as const
}

export async function fetchDashboardCounts(): Promise<DashboardCountsResponse> {
  const countsRes = await fetchWithAuth("/api/dashboard-counts", { cache: "no-store" })
  const countsPayload = (await countsRes.json().catch(() => null)) as DashboardCountsResponse | { message?: string } | null

  if (!countsRes.ok) {
    throw new Error((countsPayload && "message" in countsPayload ? countsPayload.message : null) || "Failed to load dashboard counts")
  }

  if (!hasDashboardStats(countsPayload) || !countsPayload.stats) {
    throw new Error("Dashboard counts response is invalid")
  }

  return countsPayload
}

export async function fetchDashboardProjectsSummary(): Promise<DashboardProjectsSummaryResponse> {
  const projectsSummaryRes = await fetchWithAuth("/api/dashboard-projects-summary", { cache: "no-store" })
  const projectsSummaryPayload = (await projectsSummaryRes.json().catch(() => null)) as DashboardProjectsSummaryResponse | { message?: string } | null

  if (!projectsSummaryRes.ok) {
    throw new Error((projectsSummaryPayload && "message" in projectsSummaryPayload ? projectsSummaryPayload.message : null) || "Failed to load dashboard project summary")
  }

  if (!hasDashboardLists(projectsSummaryPayload) || !projectsSummaryPayload.lists) {
    throw new Error("Dashboard project summary response is invalid")
  }

  return projectsSummaryPayload
}

export async function fetchDashboardRecentActivity(limit = 12): Promise<DashboardRecentActivityResponse> {
  const recentActivityRes = await fetchWithAuth(`/api/dashboard-recent-activity?limit=${limit}`, { cache: "no-store" })
  const recentActivityPayload = (await recentActivityRes.json().catch(() => null)) as DashboardRecentActivityResponse | { message?: string } | null

  if (!recentActivityRes.ok) {
    throw new Error((recentActivityPayload && "message" in recentActivityPayload ? recentActivityPayload.message : null) || "Failed to load dashboard activity")
  }

  if (!hasDashboardActivities(recentActivityPayload)) {
    throw new Error("Dashboard recent activity response is invalid")
  }

  return {
    activities: Array.isArray(recentActivityPayload.activities) ? recentActivityPayload.activities : [],
  }
}

export async function fetchDashboardData(limit = 12): Promise<DashboardResponse> {
  const [countsPayload, projectsSummaryPayload, recentActivityPayload] = await Promise.all([
    fetchDashboardCounts(),
    fetchDashboardProjectsSummary(),
    fetchDashboardRecentActivity(limit),
  ])

  return {
    stats: countsPayload.stats!,
    lists: projectsSummaryPayload.lists!,
    activities:
      hasDashboardActivities(recentActivityPayload) && Array.isArray(recentActivityPayload.activities)
        ? recentActivityPayload.activities
        : [],
  }
}

export async function prefetchDashboardData(
  queryClient: QueryClient,
  {
    userId,
    workspaceId,
    limit = 50,
  }: {
    userId?: string | null
    workspaceId?: string | null
    limit?: number
  },
) {
  if (!userId) return
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: getDashboardCountsQueryKey(userId, workspaceId),
      queryFn: fetchDashboardCounts,
      staleTime: 60_000,
      gcTime: 10 * 60_000,
    }),
    queryClient.prefetchQuery({
      queryKey: getDashboardProjectsSummaryQueryKey(userId, workspaceId),
      queryFn: fetchDashboardProjectsSummary,
      staleTime: 45_000,
      gcTime: 10 * 60_000,
    }),
    queryClient.prefetchQuery({
      queryKey: getDashboardRecentActivityQueryKey(userId, workspaceId, limit),
      queryFn: () => fetchDashboardRecentActivity(limit),
      staleTime: 30_000,
      gcTime: 10 * 60_000,
    }),
  ])
}
