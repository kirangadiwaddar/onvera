"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import type { Team, TeamMember } from "@/types/team"

import { Badge } from "@/components/ui/badge"
import { LoadingState } from "@/components/loadingState"
import { EmptyState } from "@/components/emptyState"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAvatarColor } from "@/lib/get-avatar-colors"

import { CalendarDays, Trash2, Users } from "lucide-react"
import { ProjectCard } from "@/components/project-card"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import { InviteMemberDialog } from "@/components/InvitememberDialog"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"

import { toast } from "sonner"
import Link from "next/link"

export default function TeamDetailPage() {

  const params = useParams()
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug

  const [team, setTeam] = useState<Team | null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [deleteMember, setDeleteMember] = useState<TeamMember | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [promoteMember, setPromoteMember] = useState<TeamMember | null>(null)
  const [promoteOpen, setPromoteOpen] = useState(false)

  /* ---------------- FETCH TEAM ---------------- */

  useEffect(() => {

    if (!slug) return

    fetch(`/api/teams/${slug}`, { cache: "no-store" })
      .then(res => {
        if (!res.ok) throw new Error("Not found")
        return res.json()
      })
      .then(data => {

        setTeam({
          ...data.team,
          members: data.members ?? []
        })

        setProjects(data.projects ?? [])

      })
      .catch(() => setTeam(null))
      .finally(() => setLoading(false))

  }, [slug])

  if (loading)
    return (
      <LoadingState
        title="Loading Team"
        description="Fetching team details..."
      />
    )

  if (!team)
    return (
      <EmptyState
        icon={<Users />}
        title="Team Not Found"
        description="We couldn't find this team."
      />
    )

  /* ---------------- DERIVE MEMBERS ---------------- */

  const lead = team.members.find(m => m.team_role === "lead")
const members = team.members.filter(m => m.team_role !== "lead")

  return (

    <div className="team-inner-page">

      {/* HEADER */}

      <div className="flex items-center justify-between gap-10 p-6">

        <p className="text-sm text-muted-foreground">
          {team.description}
        </p>

        <div className="flex items-center gap-2">

          <Badge className="bg-blue-50 text-blue-700 py-2 px-3">
            <CalendarDays />
            {new Date(team.created_at).toLocaleDateString("en-GB")}
          </Badge>

          <Badge className="bg-green-50 text-green-700 py-2 px-3 capitalize">
            Status: {team.status}
          </Badge>

          <Badge className="bg-purple-50 text-purple-700 py-2 px-3">
            Projects Assigned: {projects.length}
          </Badge>

        </div>

      </div>

      <Separator />

      {/* MEMBERS */}

      <div className="space-y-6 p-6">

        <div className="flex items-center justify-between">

          <h2 className="text-lg font-semibold">
            Team Members
          </h2>

          <InviteMemberDialog
            teamId={team.id}
            leadExists={!!lead}
            onAdded={(member: TeamMember) =>
              setTeam(prev => ({
                ...prev!,
                members: [...prev!.members, member]
              }))
            }
          />

        </div>

        <div className="rounded-xl border overflow-hidden">

          <Table>

            <TableHeader>

              <TableRow>

                <TableHead>Member</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>

              </TableRow>

            </TableHeader>

            <TableBody>

              {/* TEAM LEAD */}

              {lead && (

                <TableRow className="bg-muted/50">

                  <TableCell className="flex items-center gap-3 py-4">

                    <Avatar>

                      <AvatarImage src={lead.avatar_src ?? ""} />

                      <AvatarFallback
                        className={`${getAvatarColor(String(lead.id))} capitalize`}
                      >
                        {lead.name[0]}
                      </AvatarFallback>

                    </Avatar>

                    <span className="font-medium">
                      {lead.name}
                    </span>

                  </TableCell>

                  <TableCell>{lead.designation ?? "-"}</TableCell>

                  <TableCell className="capitalize">
                    {lead.team_role}
                  </TableCell>

                  <TableCell>

                    <Badge variant="outline">
                      {lead.status === "active"
                        ? "Active"
                        : "Pending"}
                    </Badge>

                  </TableCell>

                  <TableCell className="text-right">

                    <Button
                      size="sm"
                      variant="destructiveLight"
                      onClick={() => {
                        setDeleteMember(lead)
                        setDeleteOpen(true)
                      }}
                    >
                      <Trash2 />
                    </Button>

                  </TableCell>

                </TableRow>

              )}

              {/* MEMBERS */}

              {members.map(member => (

                <TableRow key={member.id}>

                  <TableCell className="flex items-center gap-3 py-4">

                    <Avatar>

                      <AvatarImage src={member.avatar_src ?? ""} />

                      <AvatarFallback
                        className={getAvatarColor(String(member.id))}
                      >
                        {member.name[0]}
                      </AvatarFallback>

                    </Avatar>

                    {member.name}

                  </TableCell>

                  <TableCell>{member.designation ?? "-"}</TableCell>

                  <TableCell>{member.team_role}</TableCell>

                  <TableCell>

                    <Badge variant="outline">
                      {member.status === "active"
                        ? "Active"
                        : "Pending"}
                    </Badge>

                  </TableCell>

                  <TableCell className="text-right space-x-2">

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {

                        if (lead) {
                          toast.error(
                            "A lead already exists."
                          )
                          return
                        }

                        setPromoteMember(member)
                        setPromoteOpen(true)

                      }}
                    >
                      Make Lead
                    </Button>

                    <Button
                      size="sm"
                      variant="destructiveLight"
                      onClick={() => {
                        setDeleteMember(member)
                        setDeleteOpen(true)
                      }}
                    >
                      <Trash2 />
                    </Button>

                  </TableCell>

                </TableRow>

              ))}

            </TableBody>

          </Table>

        </div>

      </div>

      <Separator />

      {/* PROJECTS */}

      <div className="space-y-6 p-6">

        <h2 className="text-lg font-semibold">
          Projects Assigned ({projects.length})
        </h2>

        {projects.length > 0 ? (

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map(project => (

              <Link key={project.id} href={`/projects/${project.slug}`}>

                <div className="border rounded-lg p-4 hover:bg-zinc-50">

                  <div className="font-medium">
                    {project.title}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {project.status}
                  </div>

                </div>

              </Link>

            ))}

          </div>

        ) : (

          <p className="text-sm text-muted-foreground">
            No projects assigned to this team.
          </p>

        )}

      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>

  <AlertDialogContent>

    <AlertDialogHeader>

      <AlertDialogTitle>
        Remove {deleteMember?.name} from team?
      </AlertDialogTitle>

      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>

    </AlertDialogHeader>

    <AlertDialogFooter>

      <AlertDialogCancel>
        Cancel
      </AlertDialogCancel>

      <AlertDialogAction
        onClick={async () => {

          if (!deleteMember) return

          await fetch("/api/team-members", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              id: deleteMember.id
            })
          })

          setTeam(prev => ({
            ...prev!,
            members: prev!.members.filter(
              m => m.id !== deleteMember.id
            )
          }))

          setDeleteMember(null)
          setDeleteOpen(false)

        }}
      >
        Delete
      </AlertDialogAction>

    </AlertDialogFooter>

  </AlertDialogContent>

</AlertDialog>

<AlertDialog open={promoteOpen} onOpenChange={setPromoteOpen}>

  <AlertDialogContent>

    <AlertDialogHeader>

      <AlertDialogTitle>
        Make {promoteMember?.name} the team lead?
      </AlertDialogTitle>

      <AlertDialogDescription>
        This will assign lead permissions to this member.
      </AlertDialogDescription>

    </AlertDialogHeader>

    <AlertDialogFooter>

      <AlertDialogCancel>
        Cancel
      </AlertDialogCancel>

      <AlertDialogAction
        onClick={async () => {

          if (!promoteMember) return

          await fetch("/api/team-members/promote", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              id: promoteMember.id
            })
          })

          setTeam(prev => ({
            ...prev!,
            members: prev!.members.map(m =>
              m.id === promoteMember.id
                ? { ...m, team_role: "lead" }
                : m
            )
          }))

          toast.success(`${promoteMember.name} is now the team lead`)

          setPromoteMember(null)
          setPromoteOpen(false)

        }}
      >
        Confirm
      </AlertDialogAction>

    </AlertDialogFooter>

  </AlertDialogContent>

</AlertDialog>

    </div>

  )

}