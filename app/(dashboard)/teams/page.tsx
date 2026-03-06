"use client"

import { Separator } from "@/components/ui/separator"
import { useState, useEffect } from "react"
import TeamCard from "@/components/teamCard"
import type { Team } from "@/types/team"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { TeamDialog } from "@/components/TeamDialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

export default function Page() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null)

  const [role, setRole] = useState<string | null>(null)
  useEffect(() => {
  const loadRole = async () => {
    const res = await fetch("/api/me")
    const data = await res.json()
    setRole(data.role)
  }

  loadRole()
}, [])

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch("/api/teams", {
          cache: "no-store",
        })

        if (!res.ok) {
          console.error("Failed to fetch teams")
          return
        }

        const data = await res.json()

        console.log("Teams API:", data)

        setTeams(data || [])
      } catch (err) {
        console.error("Team fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchTeams()
  }, [])

async function handleDelete(id: number) {
  try {
    const res = await fetch("/api/teams", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ id })
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data?.error || "Delete failed")
    }

    setTeams((prev) => prev.filter((team) => team.id !== id))

    toast.success("Team deleted successfully")

    setDeletingTeam(null)

  } catch (err: any) {
    console.error(err)
    toast.error(err.message || "Failed to delete team")
  }
}

  function handleEdit(team: Team) {
  setEditingTeam(null)   
  // allow React to register the state change
  setTimeout(() => {
    setEditingTeam(team)
  }, 0)
}

  function handleTeamUpdated(updated: Team) {
    setTeams((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    )
  }


  if (loading) {
    return <div className="p-6 text-sm">Loading teams...</div>
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col lg:flex-row items-center justify-between px-7 gap-4 lg:gap-5">
        <p className="text-sm flex-1 lg:line-clamp-2">
          Create a team to manage projects more effectively and keep collaboration structured.
        </p>

{role !== "member" && (
        <TeamDialog
  team={editingTeam ?? undefined}
  onClose={() => setEditingTeam(null)}
  onTeamUpdated={handleTeamUpdated}
  onSaved={(team) => setTeams((prev) => [...prev, team])}
/>)}
      </div>

      <Separator className="my-0 bg-gray-100" />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-7 pb-0 pt-0">
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">No teams found.</p>
        ) : (
          teams.map((team, index) => (
            <TeamCard
              key={team.id}
              slug={team.slug}
              team={team}
              index={index}
              projectsAssigned={team.projectsAssigned ?? 0}
              onEdit={() => handleEdit(team)}
              onDelete={() => setDeletingTeam(team)}
            />
          ))
        )}
      </div>

      <AlertDialog
        open={!!deletingTeam}
        onOpenChange={(open) => !open && setDeletingTeam(null)}
      >
        <AlertDialogContent>

          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete the "{deletingTeam?.name}" team?
            </AlertDialogTitle>

            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the team.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={() => deletingTeam && handleDelete(deletingTeam.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>

        </AlertDialogContent>
      </AlertDialog>
    </div>

  )
}