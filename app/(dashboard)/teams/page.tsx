"use client"

import { useEffect, useState } from "react"
import { LayoutGrid, List, Plus, Users } from "lucide-react"
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

export default function Page() {
  const { profile, user, loading: authLoading } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null)
  const isReadOnlyRole = profile?.role === "team_member" || profile?.role === "project_member"
  const isFreelancer = profile?.role === "freelancer"

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
    if (isFreelancer) return
    void loadTeams()
  }, [authLoading, isFreelancer, user?.id])

  const handleCreateTeam = async (values: TeamFormValues) => {
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

      await loadTeams()
      setDeletingTeam(null)
      toast.success("Team deleted")
    } catch (error) {
      console.error("Delete team failed:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete team")
    } finally {
      setSubmitting(false)
    }
  }

  if (isFreelancer) {
    return (
      <EmptyState
        title="Teams Unavailable"
        description="Freelancer workspaces don't have access to teams."
      />
    )
  }

  if (loadingTeams) {
    return (
      <LoadingState
        title="Loading Teams"
        description="Fetching your teams and assignments."
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
                {!isReadOnlyRole && (
                  <Button variant="gradient" onClick={() => setIsCreateOpen(true)}>
                    <Plus /> Create Team
                  </Button>
                )}
              </div>
            </div>
            <Separator className="my-0 bg-border" />
          </>
        ) : null}
        {teams.length === 0 ? (
          <div className="px-7">
            <EmptyState
              icon={<Users />}
              title="No teams yet"
              description="Create your first team to start organizing projects and collaboration."
              buttonText={!isReadOnlyRole ? "Create Team" : undefined}
              onClick={!isReadOnlyRole ? () => setIsCreateOpen(true) : undefined}
            />
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-7 pb-0 pt-0">
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                slug={team.slug}
                team={team}
                projectsAssigned={team.projectsAssigned}
                onEdit={isReadOnlyRole ? undefined : (selectedTeam) => setEditingTeam(selectedTeam)}
                onDelete={isReadOnlyRole ? undefined : (selectedTeam) => setDeletingTeam(selectedTeam)}
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
                  {teams.map((team) => {
                    const memberCount = (team.members?.length ?? 0) + (team.lead ? 1 : 0)
                    return (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">
                          <Link href={`/teams/${team.slug}`} className="hover:underline">
                            {team.name}
                          </Link>
                        </TableCell>
                        <TableCell className="capitalize">{team.status}</TableCell>
                        <TableCell>{team.projectsAssigned ?? 0}</TableCell>
                        <TableCell>{memberCount}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/teams/${team.slug}`}>View</Link>
                            </Button>
                            {!isReadOnlyRole && (
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

      {!isReadOnlyRole && isCreateOpen ? (
        <TeamModal
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          mode="create"
          loading={submitting}
          onSubmit={handleCreateTeam}
        />
      ) : null}

      {!isReadOnlyRole && editingTeam ? (
        <TeamModal
          open={!!editingTeam}
          onOpenChange={(open) => {
            if (!open) setEditingTeam(null)
          }}
          mode="edit"
          loading={submitting}
          initialValues={{
            name: editingTeam.name,
            description: editingTeam.description,
            status: editingTeam.status,
          }}
          onSubmit={handleEditTeam}
        />
      ) : null}

      {!isReadOnlyRole && <DeleteTeamAlert
        open={!!deletingTeam}
        onOpenChange={(open) => {
          if (!open) setDeletingTeam(null)
        }}
        teamName={deletingTeam?.name}
        loading={submitting}
        onConfirm={handleDeleteTeam}
      />}
    </>
  )
}
