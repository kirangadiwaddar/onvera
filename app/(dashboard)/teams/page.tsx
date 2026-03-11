"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"

import TeamCard from "@/components/teamCard"
import { TeamModal, type TeamFormValues } from "@/components/teams/team-modal"
import { DeleteTeamAlert } from "@/components/teams/delete-team-alert"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { Team } from "@/types/team"
import { useAuth } from "@/components/providers/auth-provider"
import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { toast } from "sonner"
import { LoadingState } from "@/components/loadingState"
import { EmptyState } from "@/components/emptyState"

export default function Page() {
  const { profile } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [submitting, setSubmitting] = useState(false)

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
    if (isFreelancer) return
    void loadTeams()
  }, [isFreelancer])

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
        <div className="flex flex-col lg:flex-row items-center justify-between px-7 gap-4 lg:gap-5">
          <p className="text-sm flex-1 lg:line-clamp-2">Create a team to manage projects more effectively and keep collaboration structured.</p>
          {!isReadOnlyRole && <Button variant="gradient" onClick={() => setIsCreateOpen(true)}><Plus /> Create Team</Button>}
        </div>
        <Separator className="my-0 bg-border" />
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
