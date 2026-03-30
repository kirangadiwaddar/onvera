"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import type { Team, TeamMember } from "@/types/team"
import type { Project } from "@/types/project"
import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { Badge } from "@/components/ui/badge"
import { LoadingState } from "@/components/loadingState"
import { EmptyState } from "@/components/emptyState"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAvatarColor } from "@/lib/get-avatar-colors"
import { CalendarDays, Copy, Crown, LayoutGrid, List, Plus, Trash2, UserRoundCheck, TriangleAlert } from "lucide-react"
import { ProjectCard } from "@/components/project-card"
import { toast } from "sonner"
import { canUseTeams, normalizePlan } from "@/lib/billing/plans"

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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/components/providers/auth-provider"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { statusLabel, statusStyles } from "@/lib/project-status"

type TeamDetailResponse = {
  team: Team
  projects: Project[]
}

type ProjectSummary = {
  id: number
  slug: string
  title: string
  status: Project["status"]
  createdAt?: string
  updatedAt?: string
  teamIds: number[]
}

export default function TeamDetailPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const params = useParams()
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug

  const [team, setTeam] = useState<Team | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [allProjects, setAllProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)

  const [openInvite, setOpenInvite] = useState(false)
  const [memberName, setMemberName] = useState("")
  const [memberEmail, setMemberEmail] = useState("")
  const [memberRole, setMemberRole] = useState("")
  const [memberPosition, setMemberPosition] = useState<"member" | "lead">("member")
  const [savingTeam, setSavingTeam] = useState(false)
  const [openAssignProject, setOpenAssignProject] = useState(false)
  const [selectedProjectSlug, setSelectedProjectSlug] = useState("")
  const [assignSearch, setAssignSearch] = useState("")
  const [pendingMemberDelete, setPendingMemberDelete] = useState<{ id: number; name: string; email?: string | null; isLead: boolean } | null>(null)
  const [pendingProjectUnassign, setPendingProjectUnassign] = useState<Project | null>(null)
  const [confirmDemoteLead, setConfirmDemoteLead] = useState(false)
  const [unassigningProject, setUnassigningProject] = useState(false)
  const [projectsView, setProjectsView] = useState<"grid" | "table">("grid")
  const [projectsPage, setProjectsPage] = useState(1)
  const [membersPage, setMembersPage] = useState(1)
  const [is2xl, setIs2xl] = useState(false)
  const isReadOnlyRole = profile?.role === "team_member" || profile?.role === "project_member"
  const isSuperAdmin = profile?.role === "super_admin"
  const isTeamLead = profile?.role === "team_lead"
  const isProjectMember = profile?.role === "project_member"
  const currentEmail = (user?.email || "").trim().toLowerCase()
  const canInviteMembers = isSuperAdmin || isTeamLead
  const canAssignProjects = isSuperAdmin
  const currentPlan = normalizePlan(
    profile?.plan || (typeof user?.user_metadata?.plan === "string" ? user.user_metadata.plan : null),
  )
  const planAllowsTeams = canUseTeams(currentPlan)
  const inviteBaseUrl =
    typeof window !== "undefined" ? `${window.location.origin}/invite` : ""
  const buildInviteUrl = (token?: string | null) => {
    if (!token || !inviteBaseUrl) return ""
    const params = new URLSearchParams({ token })
    return `${inviteBaseUrl}?${params.toString()}`
  }

  const loadTeam = useCallback(async () => {
    if (!slug) return

    const response = await fetchWithAuth(`/api/teams/${slug}`, { cache: "no-store" })

    if (!response.ok) {
      throw new Error("Not found")
    }

    const data = (await response.json()) as TeamDetailResponse
    setTeam(data.team)
    setProjects(data.projects || [])

  }, [slug])

  useEffect(() => {
    if (authLoading) return
    if (!user?.id) {
      setTeam(null)
      setProjects([])
      setAllProjects([])
      setLoading(false)
      return
    }
    if (!slug) return
    if (!planAllowsTeams && isSuperAdmin) {
      setLoading(false)
      return
    }

    void loadTeam()
      .catch(() => {
        setTeam(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [authLoading, isReadOnlyRole, loadTeam, planAllowsTeams, slug, user?.id])

  useEffect(() => {
    if (authLoading) return
    if (!user?.id) return
    if (!openAssignProject) return
    if (allProjects.length > 0) return

    const loadProjectSummary = async () => {
      const projectResponse = await fetchWithAuth("/api/projects?summary=1", { cache: "no-store" })
      const projectData = (await projectResponse.json()) as { projects?: ProjectSummary[] }
      setAllProjects(Array.isArray(projectData.projects) ? projectData.projects : [])
    }

    void loadProjectSummary()
  }, [allProjects.length, authLoading, openAssignProject, user?.id])

  useEffect(() => {
    if (typeof window === "undefined") return
    const media = window.matchMedia("(min-width: 1536px)")
    const update = () => setIs2xl(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  const projectsPerPage = projectsView === "table" ? 10 : is2xl ? 8 : 6
  const totalProjectPages = Math.ceil(projects.length / projectsPerPage)
  const projectsStartIndex = (projectsPage - 1) * projectsPerPage
  const projectsEndIndex = projectsStartIndex + projectsPerPage
  const projectsToShow = useMemo(
    () => projects.slice(projectsStartIndex, projectsEndIndex),
    [projects, projectsStartIndex, projectsEndIndex]
  )

  useEffect(() => {
    setProjectsPage(1)
  }, [projectsView, is2xl])

  const membersPerPage = 10
  const teamMembers = useMemo(() => team?.members ?? [], [team?.members])
  const totalMemberPages = Math.ceil(teamMembers.length / membersPerPage)
  const membersStartIndex = (membersPage - 1) * membersPerPage
  const membersEndIndex = membersStartIndex + membersPerPage
  const membersToShow = useMemo(
    () => teamMembers.slice(membersStartIndex, membersEndIndex),
    [teamMembers, membersStartIndex, membersEndIndex]
  )
  const canDeleteMember = (member: TeamMember) => {
    if (isSuperAdmin) return true
    if (isTeamLead) return !!member.invitedByEmail && member.invitedByEmail === currentEmail
    return false
  }
  const canSetLead = isSuperAdmin
  const showMemberActions = isSuperAdmin || isTeamLead
  const memberTableCols = 5 + (isSuperAdmin ? 1 : 0) + (showMemberActions ? 1 : 0)

  useEffect(() => {
    setMembersPage(1)
  }, [team?.id, teamMembers.length])

  const persistTeamMembers = async (nextLead: Team["lead"] | null, nextMembers: TeamMember[]) => {
    if (!team) return

    setSavingTeam(true)
    try {
      const response = await fetchWithAuth(`/api/teams/${team.slug}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lead: nextLead,
          members: nextMembers,
        }),
      })

      if (!response.ok) {
        throw new Error("Unable to save team members")
      }

      const data = (await response.json()) as TeamDetailResponse
      setTeam(data.team)
      setProjects(data.projects || [])
    } catch (error) {
      console.error("Team member update failed:", error)
    } finally {
      setSavingTeam(false)
    }
  }

  const handleInviteMember = async () => {
    if (!team || !memberName.trim() || !memberRole.trim() || !memberEmail.trim()) return

    const tokenBytes = new Uint8Array(12)
    crypto.getRandomValues(tokenBytes)
    const accessToken = Array.from(tokenBytes, (byte) => byte.toString(16).padStart(2, "0")).join("")

    const newMember: TeamMember = {
      id: Date.now(),
      name: memberName.trim(),
      role: memberRole.trim(),
      image: "",
      email: memberEmail.trim().toLowerCase(),
      accessToken,
      invitedByEmail: currentEmail || undefined,
      invitedByRole: isSuperAdmin ? "super_admin" : isTeamLead ? "team_lead" : undefined,
    }

    const members = team.members ?? []

    if (memberPosition === "lead" && !team.lead) {
      await persistTeamMembers(newMember, members)
    } else {
      await persistTeamMembers(team.lead ?? null, [...members, newMember])
    }

    const inviteResponse = await fetchWithAuth("/api/invitations/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: newMember.email,
        name: newMember.name,
        memberRole: memberPosition === "lead" ? "team_lead" : "team_member",
        token: newMember.accessToken,
        contextName: team.name,
        contextType: "team",
      }),
    })
    const inviteData = await inviteResponse.json().catch(() => null) as { sent?: boolean; message?: string } | null
    if (!inviteResponse.ok || inviteData?.sent === false) {
      const errorMessage = inviteData?.message || "Failed to send invite email"
      console.warn(errorMessage)
      toast.error(errorMessage)
    } else {
      toast.success("Member invited")
    }

    setMemberName("")
    setMemberEmail("")
    setMemberRole("")
    setMemberPosition("member")
    setOpenInvite(false)
  }

  const handleRemoveMember = async (memberId: number, isLead: boolean) => {
    if (!team) return

    if (isLead) {
      await persistTeamMembers(null, team.members ?? [])
      return
    }

    const nextMembers = (team.members ?? []).filter((member) => member.id !== memberId)
    await persistTeamMembers(team.lead ?? null, nextMembers)
  }


  const handleSetLead = async (member: TeamMember) => {
    if (!team) return
    if (team.lead) return

    const withoutSelected = (team.members ?? []).filter((item) => item.id !== member.id)
    const nextMembers = team.lead ? [...withoutSelected, team.lead] : withoutSelected

    await persistTeamMembers(member, nextMembers)
  }

  const handleDemoteLeadToMember = async () => {
    if (!team?.lead) return
    await persistTeamMembers(null, [...(team.members ?? []), team.lead])
  }

  const handleAssignProject = async () => {
    if (!team || !selectedProjectSlug) return

    const selectedProject = allProjects.find((project) => project.slug === selectedProjectSlug)
    if (!selectedProject) return

    const nextTeamIds = Array.from(new Set([...(selectedProject.teamIds || []), team.id]))

    try {
      const response = await fetchWithAuth(`/api/projects/${selectedProject.slug}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamIds: nextTeamIds,
        }),
      })

      if (!response.ok) {
        throw new Error("Unable to assign team to project")
      }

      setSelectedProjectSlug("")
      setOpenAssignProject(false)
      await loadTeam()
    } catch (error) {
      console.error("Project assignment failed:", error)
    }
  }

  const handleUnassignProject = async (project: Project) => {
    if (!team) return

    const nextTeamIds = (project.teamIds || []).filter((teamId) => teamId !== team.id)

    try {
      setUnassigningProject(true)
      const response = await fetchWithAuth(`/api/projects/${project.slug}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamIds: nextTeamIds,
        }),
      })

      if (!response.ok) {
        throw new Error("Unable to unassign team from project")
      }

      await loadTeam()
    } catch (error) {
      console.error("Project unassignment failed:", error)
    } finally {
      setUnassigningProject(false)
    }
  }

  if (authLoading) {
    return (
      <LoadingState
        title="Loading Team"
        description="Checking your access permissions."
      />
    )
  }

  if (isProjectMember) {
    return (
      <EmptyState
        icon={<TriangleAlert className="text-destructive" />}
        title="Teams Unavailable"
        description="Teams are available only to team leads and team members."
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

  if (loading) {
    return <LoadingState title="Loading Teams" description="Please wait while we fetch your team" />
  }

  if (!team) {
    return <EmptyState icon={<TriangleAlert className="text-destructive" />} title="Team Not Found" description="We couldn't find this team." />
  }

  const formattedDate = new Date(team.createdAt).toLocaleDateString("en-GB")
  const adminName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Admin"
  const adminRoleLabel = isSuperAdmin ? "Super Admin" : "Team Lead"
  const assignableProjects = allProjects.filter((project) => {
    const notAssigned = !project.teamIds?.includes(team.id)
    const matchesSearch = project.title.toLowerCase().includes(assignSearch.toLowerCase())
    return notAssigned && matchesSearch
  })
  const selectedProject = allProjects.find((project) => project.slug === selectedProjectSlug) ?? null

  return (
    <div className="team-inner-page">
      <div className="team-header flex items-center justify-between gap-10 p-6">
        <p className="text-sm text-muted-foreground">{team.description}</p>
        <div className="right-badges flex items-center justify-end gap-2">
          <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 py-2 px-3">
            <CalendarDays /> {formattedDate}
          </Badge>
          <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 py-2 px-3 capitalize">
            Status: {team.status}
          </Badge>
          <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 py-2 px-3">
            Projects Assigned: {projects.length}
          </Badge>
        </div>
      </div>

      <Separator className="my-0 bg-border" />

      <div className="space-y-6 p-6">
        <div className="flex items-center gap-10 justify-between">
          <h2 className="text-lg font-semibold">Team Members</h2>
          {canInviteMembers && (
            <Button variant="gradient" onClick={() => setOpenInvite(true)}>
              <Plus /> Invite Member
            </Button>
          )}
        </div>

        <div className="rounded-xl border overflow-hidden">
          <Table className="[&_th]:px-5 [&_th]:py-3 [&_td]:px-5 [&_td]:py-3 text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="">Member</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Status</TableHead>
                {isSuperAdmin && <TableHead>Access Token</TableHead>}
                {showMemberActions && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>

            <TableBody>
              {isSuperAdmin && (
              <TableRow className="bg-zinc-50/70 dark:bg-white/5">
                <TableCell className="flex items-center gap-3 py-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar>
                        <AvatarImage src={user?.user_metadata?.avatar_url || ""} alt={adminName} />
                        <AvatarFallback className={`font-bold ${getAvatarColor(adminName)}`}>
                          {adminName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <span className="font-medium">{adminName}</span>
                    </TooltipContent>
                  </Tooltip>


                </TableCell>
                <TableCell>{user?.email || "-"}</TableCell>
                <TableCell>{`Admin (${adminRoleLabel})`}</TableCell>
                <TableCell>
                  <Badge className="bg-zinc-900 text-white border border-zinc-800">Admin</Badge>
                </TableCell>
                <TableCell>
                  <Badge className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                    Active
                  </Badge>
                </TableCell>
                {isSuperAdmin && <TableCell>-</TableCell>}
                {isSuperAdmin && (
                  <TableCell className="text-right text-xs text-muted-foreground">Owner Access</TableCell>
                )}
              </TableRow>
              )}

              {team.lead ? (
                <TableRow className="bg-muted/50">
                  <TableCell className="flex items-center gap-3 py-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar>
                          <AvatarImage src={team.lead.image} alt={team.lead.name} />
                          <AvatarFallback className={`font-bold ${getAvatarColor(team.lead?.name || team.lead?.email || "M")}`}>
                            {team.lead.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span className="font-medium">{team.lead.name}</span>
                      </TooltipContent>
                    </Tooltip>


                  </TableCell>
                  <TableCell>{team.lead.email || "-"}</TableCell>
                  <TableCell>{team.lead.role}</TableCell>
                  <TableCell>
                    <Badge className="bg-sky-100 text-sky-700 border border-sky-200">
                      <Crown className="size-3.5" /> Lead
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(team.lead.isRegistered ?? !team.lead.accessToken) ? (
                      <Badge className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  {isSuperAdmin && (
                    <TableCell>
                      {team.lead.accessToken ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs"
                          onClick={() => {
                            const link = buildInviteUrl(team.lead?.accessToken || "")
                            void navigator.clipboard.writeText(link || team.lead?.accessToken || "")
                          }}
                        >
                          <Copy className="size-3.5" /> Copy
                        </Button>
                      ) : "-"}
                    </TableCell>
                  )}
                  {isSuperAdmin && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={savingTeam}
                          onClick={() => setConfirmDemoteLead(true)}
                        >
                          Make Member
                        </Button>
                      </div>
                    </TableCell>
                  )}
                  {showMemberActions && !isSuperAdmin && (
                    <TableCell className="text-right">-</TableCell>
                  )}
                </TableRow>
              ) : null}

              {teamMembers.length > 0 ? (
                membersToShow.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="flex items-center gap-3 py-4">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Avatar>
                            <AvatarImage src={member.image} alt={member.name} />
                            <AvatarFallback className={`font-bold ${getAvatarColor(member.name || member.email || "M")}`}>
                              {member.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                          <span className="font-medium">{member.name}</span>
                        </TooltipContent>
                      </Tooltip>


                    </TableCell>
                    <TableCell>{member.email || "-"}</TableCell>
                    <TableCell>{member.role}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">Member</Badge>
                    </TableCell>
                    <TableCell>
                      {(member.isRegistered ?? !member.accessToken) ? (
                        <Badge className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        {member.accessToken ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs"
                            onClick={() => {
                              const link = buildInviteUrl(member.accessToken)
                              void navigator.clipboard.writeText(link || member.accessToken || "")
                            }}
                          >
                            <Copy className="size-3.5" /> Copy
                          </Button>
                        ) : "-"}
                      </TableCell>
                    )}
                    {showMemberActions && (
                      <TableCell className="text-right">
                        {canSetLead || canDeleteMember(member) ? (
                          <div className="flex items-center justify-end gap-2">
                            {canSetLead && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={savingTeam || !!team.lead}
                                onClick={() => void handleSetLead(member)}
                              >
                                <UserRoundCheck /> Set Lead
                              </Button>
                            )}
                            {canDeleteMember(member) && (
                              <Button
                                size="sm"
                                variant="destructiveLight"
                                disabled={savingTeam}
                                onClick={() =>
                                  setPendingMemberDelete({
                                    id: member.id,
                                    name: member.name,
                                    email: member.email,
                                    isLead: false,
                                  })
                                }
                              >
                                <Trash2 className="dark:text-white" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : !team.lead ? (
                <TableRow>
                  <TableCell colSpan={memberTableCols} className="text-center py-8 text-muted-foreground">
                    No team members added
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        {totalMemberPages > 1 && (
          <Pagination className="mt-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setMembersPage((prev) => Math.max(prev - 1, 1))}
                />
              </PaginationItem>

              {[...Array(totalMemberPages)].map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    isActive={membersPage === i + 1}
                    onClick={() => setMembersPage(i + 1)}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setMembersPage((prev) => Math.min(prev + 1, totalMemberPages))
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>

      <Separator className="my-0 bg-border" />

      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Projects Assigned ({projects.length})</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white/70 p-1 dark:border-white/10 dark:bg-white/5">
              <Button
                size="icon-sm"
                variant={projectsView === "grid" ? "secondary" : "ghost"}
                className="rounded-full"
                onClick={() => setProjectsView("grid")}
                aria-pressed={projectsView === "grid"}
                aria-label="Grid view"
              >
                <LayoutGrid className="size-4" />
              </Button>
              <Button
                size="icon-sm"
                variant={projectsView === "table" ? "secondary" : "ghost"}
                className="rounded-full"
                onClick={() => setProjectsView("table")}
                aria-pressed={projectsView === "table"}
                aria-label="Table view"
              >
                <List className="size-4" />
              </Button>
            </div>
            {canAssignProjects && (
              <Button variant="gradient" onClick={() => setOpenAssignProject(true)}>
                <Plus /> Assign Project
              </Button>
            )}
          </div>
        </div>

        {projects.length > 0 ? (
          projectsView === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {projectsToShow.map((project) => (
                <ProjectCard
                  key={project.id}
                  id={project.id}
                  slug={project.slug}
                  title={project.title}
                  templateTitle={project.templateTitle}
                  status={project.status}
                  createdAt={project.createdAt}
                  avatarSrc={project.avatarSrc}
                  members={project.members}
                  variant="compact"
                  footerAction={
                    canAssignProjects ? (
                      <Button
                        size="sm"
                        variant="destructiveLight"
                        className="text-xs dark:text-white"
                        onClick={() => setPendingProjectUnassign(project)}
                      >
                        Unassign Team
                      </Button>
                    ) : null
                  }
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
              <Table className="[&_th]:px-5 [&_th]:py-3 [&_td]:px-5 [&_td]:py-3 text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    {canAssignProjects && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectsToShow.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 rounded-lg">
                            {project.avatarSrc && <AvatarImage src={project.avatarSrc} />}
                            <AvatarFallback className={`font-semibold ${getAvatarColor(project.title)}`}>
                              {project.title.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">{project.title}</div>
                            <div className="text-xs text-muted-foreground">{project.templateTitle || "-"}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {project.status ? (
                          <Badge className={`${statusStyles[project.status]}`}>
                            {statusLabel[project.status]}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {project.createdAt
                          ? new Date(project.createdAt).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </TableCell>
                      {canAssignProjects && (
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="destructiveLight"
                            className="text-xs dark:text-white"
                            onClick={() => setPendingProjectUnassign(project)}
                          >
                            Unassign Team
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        ) : (
          <p className="text-sm text-muted-foreground">No projects assigned to this team.</p>
        )}

        {totalProjectPages > 1 && (
          <Pagination className="mt-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setProjectsPage((prev) => Math.max(prev - 1, 1))}
                />
              </PaginationItem>

              {[...Array(totalProjectPages)].map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    isActive={projectsPage === i + 1}
                    onClick={() => setProjectsPage(i + 1)}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setProjectsPage((prev) => Math.min(prev + 1, totalProjectPages))
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>

      <Dialog open={openInvite} onOpenChange={setOpenInvite}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>
              Add a member and optionally assign as lead if no lead is currently set.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="member-name">Member Name</Label>
              <Input
                id="member-name"
                value={memberName}
                onChange={(event) => setMemberName(event.target.value)}
                placeholder="Jane Doe"
                disabled={savingTeam}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-role">Designation</Label>
              <Input
                id="member-role"
                value={memberRole}
                onChange={(event) => setMemberRole(event.target.value)}
                placeholder="Frontend Developer"
                disabled={savingTeam}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                type="email"
                value={memberEmail}
                onChange={(event) => setMemberEmail(event.target.value)}
                placeholder="member@company.com"
                disabled={savingTeam}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-position">Position</Label>
              <Select
                value={team.lead ? "member" : memberPosition}
                onValueChange={(value) => setMemberPosition(value as "member" | "lead")}
                disabled={savingTeam || !!team.lead}
              >
                <SelectTrigger id="member-position" className="w-full">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  {!team.lead ? <SelectItem value="lead">Lead</SelectItem> : null}
                </SelectContent>
              </Select>
              {team.lead ? (
                <p className="text-xs text-muted-foreground">
                  Lead already assigned. Invite is limited to member role.
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenInvite(false)} disabled={savingTeam}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={() => void handleInviteMember()} disabled={savingTeam || !memberEmail.trim()}>
              {savingTeam ? "Saving..." : "Save Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openAssignProject} onOpenChange={setOpenAssignProject}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Assign Project</DialogTitle>
            <DialogDescription>
              Assign this team to another project. One team can be linked to multiple projects.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="project-search">Project</Label>
            <Input
              id="project-search"
              value={assignSearch}
              onChange={(event) => {
                setAssignSearch(event.target.value)
                setSelectedProjectSlug("")
              }}
              placeholder="Type to search project..."
            />
            <div className="border rounded-md max-h-56 overflow-y-auto">
              {assignableProjects.length > 0 ? (
                assignableProjects.map((project) => (
                  <button
                    key={project.slug}
                    type="button"
                    onClick={() => {
                      setSelectedProjectSlug(project.slug)
                      setAssignSearch(project.title)
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${selectedProjectSlug === project.slug ? "bg-muted" : ""
                      }`}
                  >
                    {project.title}
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-muted-foreground">No matching projects</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAssignProject(false)}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={() => void handleAssignProject()}
              disabled={!selectedProject}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingMemberDelete}
        onOpenChange={(open) => {
          if (!open) setPendingMemberDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingMemberDelete
                ? `Remove ${pendingMemberDelete.name} from this team. They can be invited again anytime.`
                : "Remove this member from the team. They can be invited again anytime."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingTeam}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={savingTeam}
              onClick={() => {
                if (!pendingMemberDelete) return
                void handleRemoveMember(pendingMemberDelete.id, pendingMemberDelete.isLead)
                setPendingMemberDelete(null)
              }}
            >
              {savingTeam ? "Removing..." : "Remove From Team"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!pendingProjectUnassign}
        onOpenChange={(open) => {
          if (!open) setPendingProjectUnassign(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unassign Team?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingProjectUnassign
                ? `This will remove the team from "${pendingProjectUnassign.title}".`
                : "This will remove the team from this project."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unassigningProject}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={unassigningProject}
              onClick={() => {
                if (!pendingProjectUnassign) return
                void handleUnassignProject(pendingProjectUnassign)
                setPendingProjectUnassign(null)
              }}
            >
              {unassigningProject ? "Unassigning..." : "Unassign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDemoteLead} onOpenChange={setConfirmDemoteLead}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Make Lead a Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to convert the current lead to a regular member?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingTeam}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={savingTeam}
              onClick={() => {
                void handleDemoteLeadToMember()
                setConfirmDemoteLead(false)
              }}
            >
              {savingTeam ? "Saving..." : "Make Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
