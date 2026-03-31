"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { LayoutGrid, List, Lock, Plus, Users, TriangleAlert } from "lucide-react"
import Link from "next/link"

import TeamCard from "@/components/teamCard"
import { TeamModal, type TeamFormValues } from "@/components/teams/team-modal"
import { DeleteTeamAlert } from "@/components/teams/delete-team-alert"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Team } from "@/types/team"
import { useAuth } from "@/components/providers/auth-provider"
import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { toast } from "sonner"
import { LoadingState } from "@/components/loadingState"
import { EmptyState } from "@/components/emptyState"
import { canUseTeams, getPlanLimits, normalizePlan } from "@/lib/billing/plans"

type WorkspaceItem = {
  id: string
  name: string
  email: string | null
  plan: string | null
  role: "super_admin" | "team_lead" | "team_member" | "project_member"
}

export default function Page() {
  const { profile, user, loading: authLoading } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const [workspaceSwitching, setWorkspaceSwitching] = useState(true)
  const workspaceSwitchTimerRef = useRef<number | null>(null)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null)
  const ensureOwnerWorkspace = (items: WorkspaceItem[]) => {
    if (!user?.id) return items
    const ownsFlag =
      typeof window !== "undefined" && window.localStorage.getItem("onvera:ownsWorkspace") === "true"
    const ownsByProfile =
      profile?.role === "super_admin" ||
      (typeof user.user_metadata?.role === "string" && user.user_metadata.role === "super_admin")
    if (!(ownsFlag || ownsByProfile)) return items
    if (items.some((workspace) => workspace.id === user.id)) return items
    const fallbackName =
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Workspace"
    return [
      {
        id: user.id,
        name: fallbackName,
        email: user.email || null,
        plan: profile?.plan || "free",
        role: "super_admin",
      },
      ...items,
    ]
  }
  const currentWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId) || null
  const workspaceRole = currentWorkspace?.role || profile?.role || null
  const isReadOnlyRole =
    workspaceRole === "team_member" ||
    workspaceRole === "project_member" ||
    workspaceRole === "team_lead"
  const isProjectMember = workspaceRole === "project_member"
  const isSuperAdmin = workspaceRole === "super_admin"
  const canManageTeams = isSuperAdmin
  const currentPlan = normalizePlan(
    currentWorkspace?.plan || profile?.plan || (typeof user?.user_metadata?.plan === "string" ? user.user_metadata.plan : null),
  )
  const planLimits = getPlanLimits(currentPlan)
  const planAllowsTeams = canUseTeams(currentPlan)
  const ownedTeamsCount = teams.filter(
    (team) => !selectedWorkspaceId || team.createdBy === selectedWorkspaceId,
  ).length
  const teamLimitReached = planLimits.maxTeams !== null && ownedTeamsCount >= planLimits.maxTeams
  const createTeamDisabled = !canManageTeams || submitting
  const lockedTeamIds = useMemo(() => {
    if (planLimits.maxTeams === null) return new Set<number>()
    const owned = teams
      .filter((team) => !selectedWorkspaceId || team.createdBy === selectedWorkspaceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const locked = owned.slice(planLimits.maxTeams).map((team) => team.id)
    return new Set(locked)
  }, [planLimits.maxTeams, teams, user?.id])

  const loadTeams = async () => {
    setLoadingTeams(true)
    try {
      const res = await fetchWithAuth("/api/teams", { cache: "no-store" })
      const data = await res.json()
      setTeams(Array.isArray(data?.teams) ? data.teams : [])
    } finally {
      setLoadingTeams(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (!user?.id) {
      setTeams([])
      setLoadingTeams(false)
      return
    }
    if (!planAllowsTeams && isSuperAdmin) return
    void loadTeams()
  }, [authLoading, planAllowsTeams, isSuperAdmin, user?.id])

  useEffect(() => {
    if (authLoading || !user?.id) return
    let active = true
    const loadWorkspaces = async () => {
      try {
        const res = await fetchWithAuth("/api/workspaces", { cache: "no-store" })
        const data = await res.json().catch(() => null) as { workspaces?: WorkspaceItem[] } | null
        if (!active) return
        let items = Array.isArray(data?.workspaces) ? data.workspaces : []
        items = ensureOwnerWorkspace(items)
        setWorkspaces(items)
        const stored = typeof window !== "undefined" ? window.localStorage.getItem("onvera:workspace") : null
        const preferred = stored && items.some((item) => item.id === stored) ? stored : null
        const fallback = items[0]?.id || null
        const nextId =
          preferred ||
          (items.some((item) => item.id === user.id) ? user.id : fallback)
        setSelectedWorkspaceId(nextId)
        setWorkspaceSwitching(false)
      } catch {
        setWorkspaces([])
        setWorkspaceSwitching(false)
      }
    }
    void loadWorkspaces()
    const handleWorkspace = () => {
      if (typeof window === "undefined") return
      setWorkspaceSwitching(true)
      if (workspaceSwitchTimerRef.current !== null) {
        window.clearTimeout(workspaceSwitchTimerRef.current)
      }
      workspaceSwitchTimerRef.current = window.setTimeout(() => {
        setWorkspaceSwitching(false)
      }, 1000)
      void loadWorkspaces()
    }
    window.addEventListener("workspace:changed", handleWorkspace)
    window.addEventListener("storage", handleWorkspace)
    return () => {
      active = false
      window.removeEventListener("workspace:changed", handleWorkspace)
      window.removeEventListener("storage", handleWorkspace)
      if (workspaceSwitchTimerRef.current !== null) {
        window.clearTimeout(workspaceSwitchTimerRef.current)
      }
    }
  }, [authLoading, user?.id])

  if (authLoading) {
    return (
      <LoadingState
        title="Loading Teams"
        description="Checking your access permissions."
      />
    )
  }

  const handleCreateTeam = async (values: TeamFormValues) => {
    if (teamLimitReached) {
      toast.error("Team limit reached for your plan.")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetchWithAuth("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { message?: string } | null
        throw new Error(payload?.message || "Failed to create team")
      }

      await loadTeams()
      setIsCreateOpen(false)
      toast.success("Team created")
    } catch (error) {
      console.error("Create team failed:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create team")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditTeam = async (values: TeamFormValues) => {
    if (!editingTeam) return

    setSubmitting(true)
    try {
      const res = await fetchWithAuth(`/api/teams/${editingTeam.slug}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { message?: string } | null
        throw new Error(payload?.message || "Failed to update team")
      }

      await loadTeams()
      setEditingTeam(null)
      toast.success("Team updated")
    } catch (error) {
      console.error("Update team failed:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update team")
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenCreateTeam = () => {
    if (teamLimitReached) {
      toast.error("Team limit reached for your plan.")
      return
    }
    setIsCreateOpen(true)
  }

  const handleDeleteTeam = async () => {
    if (!deletingTeam) return

    setSubmitting(true)
    try {
      const res = await fetchWithAuth(`/api/teams/${deletingTeam.slug}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { message?: string } | null
        throw new Error(payload?.message || "Failed to delete team")
      }

      setTeams((prev) => prev.filter((team) => team.id !== deletingTeam.id))
      setDeletingTeam(null)
      toast.success("Team deleted")
    } catch (error) {
      console.error("Delete team failed:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete team")
    } finally {
      setSubmitting(false)
    }
  }

  const workspaceReady = !workspaceSwitching && (!workspaces.length || !!selectedWorkspaceId)

  if (loadingTeams || !workspaceReady) {
    return (
      <LoadingState
        title="Loading Teams"
        description="Fetching your teams and assignments."
      />
    )
  }

  if (!planAllowsTeams && isSuperAdmin) {
    return (
      <EmptyState
       icon={<TriangleAlert className="text-destructive" />}
        title="Teams Unavailable"
        description="Teams are available only on Agency plans."
      />
    )
  }

  if (isProjectMember) {
    return (
      <EmptyState
        icon={<TriangleAlert className="text-destructive" />}
        title="Teams are not available"
        description="Your access level doesn’t include the Teams view."
      />
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {teams.length > 0 ? (
          <>
            <div className="flex flex-col lg:flex-row items-center justify-between px-7 gap-4 lg:gap-5">
              <p className="text-sm flex-1 lg:line-clamp-2">
                Create a team to manage projects more effectively and keep collaboration structured.
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white/70 p-1 dark:border-white/10 dark:bg-white/5">
                  <Button
                    size="icon-sm"
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    className="rounded-full"
                    onClick={() => setViewMode("grid")}
                    aria-pressed={viewMode === "grid"}
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="size-4" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    className="rounded-full"
                    onClick={() => setViewMode("list")}
                    aria-pressed={viewMode === "list"}
                    aria-label="List view"
                  >
                    <List className="size-4" />
                  </Button>
                </div>
                {canManageTeams && (
                  <Button
                    variant="gradient"
                    onClick={handleOpenCreateTeam}
                    disabled={createTeamDisabled}
                  >
                    <Plus /> Create Team
                  </Button>
                )}
              </div>
            </div>
            <Separator className="my-0 bg-border" />
          </>
        ) : null}
        {teams.filter((team) => !selectedWorkspaceId || team.createdBy === selectedWorkspaceId).length === 0 ? (
          <div className="px-7">
            <EmptyState
              icon={<Users />}
              title="No teams yet"
              description="Create your first team to start organizing projects and collaboration."
              buttonText={!createTeamDisabled ? "Create Team" : undefined}
              onClick={!createTeamDisabled ? handleOpenCreateTeam : undefined}
            />
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-7 pb-0 pt-0">
            {teams
              .filter((team) => !selectedWorkspaceId || team.createdBy === selectedWorkspaceId)
              .map((team) => (
              <TeamCard
                key={team.id}
                slug={team.slug}
                team={team}
                projectsAssigned={team.projectsAssigned}
                isLocked={lockedTeamIds.has(team.id)}
                onEdit={
                  !canManageTeams || lockedTeamIds.has(team.id)
                    ? undefined
                    : (selectedTeam) => setEditingTeam(selectedTeam)
                }
                onDelete={
                  !canManageTeams || lockedTeamIds.has(team.id)
                    ? undefined
                    : (selectedTeam) => setDeletingTeam(selectedTeam)
                }
              />
            ))}
          </div>
        ) : (
          <div className="p-7 pb-0 pt-0">
            <div className="rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
              <Table className="[&_th]:px-5 [&_th]:py-3 [&_td]:px-5 [&_td]:py-4 text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams
                    .filter((team) => !selectedWorkspaceId || team.createdBy === selectedWorkspaceId)
                    .map((team) => {
                    const memberCount = (team.members?.length ?? 0) + (team.lead ? 1 : 0)
                    return (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">
                          <Link href={`/teams/${team.slug}`} className="hover:underline">
                            {team.name}
                          </Link>
                          {lockedTeamIds.has(team.id) ? (
                            <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-200">
                              <Lock className="size-3" />
                              Locked
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="capitalize">{team.status}</TableCell>
                        <TableCell>{team.projectsAssigned ?? 0}</TableCell>
                        <TableCell>{memberCount}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/teams/${team.slug}`}>View</Link>
                            </Button>
                            {canManageTeams && !lockedTeamIds.has(team.id) && (
                              <>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setEditingTeam(team)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructiveLight"
                                  onClick={() => setDeletingTeam(team)}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {canManageTeams ? (
        <TeamModal
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          mode="create"
          loading={submitting}
          onSubmit={handleCreateTeam}
        />
      ) : null}

      {canManageTeams ? (
        <TeamModal
          open={Boolean(editingTeam)}
          onOpenChange={(open) => {
            if (!open) {
              window.setTimeout(() => setEditingTeam(null), 300)
            }
          }}
          mode="edit"
          loading={submitting}
          initialValues={
            editingTeam
              ? {
                  name: editingTeam.name,
                  description: editingTeam.description,
                  status: editingTeam.status,
                }
              : undefined
          }
          onSubmit={handleEditTeam}
        />
      ) : null}

      {canManageTeams && (
        <DeleteTeamAlert
          open={!!deletingTeam}
          onOpenChange={(open) => {
            if (!open) setDeletingTeam(null)
          }}
          teamName={deletingTeam?.name}
          loading={submitting}
          onConfirm={handleDeleteTeam}
        />
      )}
    </>
  )
}
