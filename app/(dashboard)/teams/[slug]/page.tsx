"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import type { Team } from "@/types/team"
import { Badge } from "@/components/ui/badge"
import { LoadingState } from "@/components/loadingState"
import { EmptyState } from "@/components/emptyState"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAvatarColor } from "@/lib/get-avatar-colors"
import { CalendarDays, Plus, Trash2 } from "lucide-react"
import { ProjectCard } from "@/components/project-card"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export default function TeamDetailPage() {
    const params = useParams()
    const slug = Array.isArray(params.slug)
        ? params.slug[0]
        : params.slug

    const [team, setTeam] = useState<Team | null>(null)
    const [projects, setProjects] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!slug) return

        fetch(`/api/teams/${slug}`, { cache: "no-store" })
            .then(res => {
                if (!res.ok) throw new Error("Not found")
                return res.json()
            })
            .then(data => {
                setTeam(data.team)
                setProjects(data.projects || [])
            })
            .catch(() => {
                setTeam(null)
            })
            .finally(() => {
                setLoading(false)
            })
    }, [slug])

    if (loading) return <div><LoadingState title="Loading Teams" description="Please wait we are fetching your teams" /></div>

    if (!team) return <EmptyState title="Team Not Found" description="We're Sorry could'nt find your team" />

    return (
        <div className="team-inner-page">
            <div className="team-header flex items-center justify-between gap-10 p-6">
                <p className="text-sm text-muted-foreground">
                    {team.description}
                </p>
                <div className="right-badges flex items-center justify-end gap-2">
                    <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 py-2 px-3">
                        <CalendarDays />{" "}
                        {new Date(team.createdAt).toLocaleDateString("en-GB")}
                    </Badge>
                    <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 py-2 px-3 capitalize">Status: {team.status}</Badge>
                    <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 py-2 px-3">
                        Projects Assigned: {projects.length}
                    </Badge>
                </div>
            </div>


            <Separator className="my-0 bg-gray-100" />

            <div className="space-y-6 p-6">
                <div className="flex items-center gap-10 justify-between">
                    <h2 className="text-lg font-semibold">Team Members</h2>
                    <Button variant="default"><Plus /> Invite Member</Button>
                </div>

                <div className="rounded-xl border overflow-hidden">
                    <Table className="[&_th]:px-5 [&_th]:py-3 [&_td]:px-5 [&_td]:py-3 text-sm">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-75">Member</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead className="text-center">Type</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>

                            {/* Team Lead Always First */}
                            {team.lead && (
                                <TableRow className="bg-muted/50">
                                    <TableCell className="flex items-center gap-3 py-4">
                                        <Avatar>
                                            <AvatarImage
                                                src={team.lead.image}
                                                alt={team.lead.name}
                                            />
                                            <AvatarFallback
                                                className={`font-bold ${getAvatarColor(String(team.lead.id))}`}
                                            >
                                                {team.lead.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>

                                        <span className="font-medium">
                                            {team.lead.name}
                                        </span>
                                    </TableCell>

                                    <TableCell className="py-4">
                                        {team.lead.role}
                                    </TableCell>

                                    <TableCell className="text-center py-4">
                                        <span className="px-2 py-1 text-xs bg-sky-100 text-sky-700 rounded">
                                            Team Lead
                                        </span>
                                    </TableCell>
                                    <TableCell className="flex items-center gap-2 justify-end">
                                        <Button size="sm" variant="destructiveLight"><Trash2 /></Button>
                                    </TableCell>
                                </TableRow>
                            )}

                            {/* Regular Members */}
                            {team.members.length > 0 ? (
                                team.members.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell className="flex items-center gap-3 py-4">
                                            <Avatar>
                                                <AvatarImage
                                                    src={member.image}
                                                    alt={member.name}
                                                />
                                                <AvatarFallback
                                                    className={`font-bold ${getAvatarColor(String(member.id))}`}
                                                >
                                                    {member.name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>

                                            <span className="font-medium">
                                                {member.name}
                                            </span>
                                        </TableCell>

                                        <TableCell className="py-4">
                                            {member.role}
                                        </TableCell>

                                        <TableCell className="text-center py-4 text-muted-foreground text-xs">
                                            Member
                                        </TableCell>
                                        <TableCell className="flex items-center gap-2 justify-end">
                                            <Button size="sm" variant="destructiveLight"><Trash2 /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                !team.lead && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={3}
                                            className="text-center py-8 text-muted-foreground"
                                        >
                                            No team members added
                                        </TableCell>
                                    </TableRow>
                                )
                            )}

                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* ================= Projects Assigned ================= */}

<Separator className="my-0 bg-gray-100" />

<div className="space-y-6 p-6">
  <div className="flex items-center justify-between">
    <h2 className="text-lg font-semibold">
      Projects Assigned ({projects.length})
    </h2>
  </div>

  {projects.length > 0 ? (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          id={project.id}
          slug={project.slug}
          title={project.title}
          templateTitle={project.templateTitle}
          status={project.status}
          createdAt={project.createdAt}
          avatarSrc={project.avatarSrc}
        //   teams={project.teams}
          members={project.members}
          variant="compact"
        />
      ))}
    </div>
  ) : (
    <p className="text-sm text-muted-foreground">
      No projects assigned to this team.
    </p>
  )}
</div>   

        </div>
    )
}