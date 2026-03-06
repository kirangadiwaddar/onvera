"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import type { Project, Team } from "@/types/project"

import { templateStructure } from "@/lib/template-structure"
import ChecklistSection from "@/components/checklist-section"

import { Accordion } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

import { getAvatarColor } from "@/lib/get-avatar-colors"
import { statusStyles, statusLabel } from "@/lib/project-status"

import { EmptyState } from "@/components/emptyState"

import ClientLinkModal from "@/components/client-link-modal"

import {
  CalendarCheck,
  ArrowUpRight,
  Copy,
  Users,
  Files,
  BadgeCheck,
  ArrowDownToLine,
  Plus,
  Trash2
} from "lucide-react"

import Link from "next/link"
import ClientAccessModal from "@/components/client-access-modal"
import ResetSubmissionsButton from "@/components/reset-submission-button"

export default function ProjectDetailPage() {

  const params = useParams()

  const slug =
    typeof params.slug === "string"
      ? params.slug
      : Array.isArray(params.slug)
        ? params.slug[0]
        : ""

  /** if Freelancer Dont show the teams */
  const [role, setRole] = useState<string | null>(null)
  useEffect(() => {
    const loadRole = async () => {
      const res = await fetch("/api/me")
      const data = await res.json()
      setRole(data.role)
    }
    loadRole()
  }, [])

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  const [teamsList, setTeamsList] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState("")

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [teamModalOpen, setTeamModalOpen] = useState(false)

  const [openInvite, setOpenInvite] = useState(false)
  const [inviteType, setInviteType] = useState<"member" | "team">("member")

  const [newMemberName, setNewMemberName] = useState("")
  const [newMemberRole, setNewMemberRole] = useState("")

  const customSections = project?.custom_sections ?? []

  const [showSectionForm, setShowSectionForm] = useState(false)
  const [newSectionTitle, setNewSectionTitle] = useState("")
  const [newSectionType, setNewSectionType] = useState<"textarea" | "url">("textarea")

  const [clientLinkOpen, setClientLinkOpen] = useState(false)
  const [clientAccessOpen, setClientAccessOpen] = useState(false)

  const teams: Team[] = project?.teams ?? []
  const externalMembers = project?.members ?? []

  const templateSections =
    templateStructure[project?.template_id ?? ""] || []


  type ChecklistRole = "admin" | "member" | "client"

  const checklistRole: ChecklistRole =
    role === "agency" || role === "freelancer"
      ? "admin"
      : role === "member"
        ? "member"
        : "client"


  /* ---------------- FETCH PROJECT ---------------- */


  useEffect(() => {

    if (!slug) return

    const fetchProject = async () => {

      try {

        const res = await fetch(`/api/projects/${slug}`, {
          cache: "no-store"
        })

        const data = await res.json()

        const normalizedTeams =
          data?.teams?.map((t: any) => ({
            id: t.id ?? t.team?.id,
            name: t.name ?? t.team?.name,
            members: t.members ?? []
          })) ?? []

        setProject({
          ...data,
          teams: normalizedTeams
        })

      } catch (err) {

        console.error("Project fetch error:", err)

      } finally {

        setLoading(false)

      }

    }

    fetchProject()

  }, [slug])

  /* ---------------- FETCH TEAMS ---------------- */

  useEffect(() => {

    const fetchTeams = async () => {

      const res = await fetch("/api/teams", { cache: "no-store" })
      const data = await res.json()

      setTeamsList(data)

    }

    fetchTeams()

  }, [])

  /* ---------------- ADD TEAM ---------------- */

  const addTeam = async () => {

    if (!selectedTeamId || !project) return
    if (role === "freelancer") return

    await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: project.id,
        team_id: selectedTeamId
      })
    })

    const refreshed = await fetch(`/api/projects/${slug}`, {
      cache: "no-store"
    })

    if (project.teams?.some(t => String(t.id) === selectedTeamId)) {
      return
    }

    setProject(await refreshed.json())

    setSelectedTeamId("")
    setOpenInvite(false)

  }

  /* ---------------- DELETE EXTERNAL MEMBER ---------------- */

  const deleteMember = async (id: string | number) => {

    await fetch("/api/project-members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    })

    setProject(prev =>
      prev
        ? {
          ...prev,
          members: prev.members?.filter(m => m.id !== id)
        }
        : prev
    )

  }

  /* ---------------- ADD EXTERNAL MEMBER ---------------- */

  const addExternalMember = async () => {

    if (!newMemberName || !newMemberRole || !project) return

    const res = await fetch("/api/project-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: project.id,
        name: newMemberName,
        role: newMemberRole,
        is_external: true
      })
    })

    const member = await res.json()

    setProject(prev =>
      prev
        ? {
          ...prev,
          members: [...(prev.members || []), member]
        }
        : prev
    )

    setNewMemberName("")
    setNewMemberRole("")
    setOpenInvite(false)

  }

  if (loading) return <div className="p-6">Loading...</div>
  if (!project) return <div className="p-6">Project not found</div>

  /* ---------------- DELETE MODAL ---------------- */

  const DeleteModal = ({
    title,
    description,
    onConfirm,
    trigger
  }: {
    title: string
    description: string
    onConfirm: () => void
    trigger: React.ReactNode
  }) => (

    <AlertDialog>

      <AlertDialogTrigger asChild>
        {trigger}
      </AlertDialogTrigger>

      <AlertDialogContent>

        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>

          <AlertDialogCancel>
            Cancel
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </AlertDialogAction>

        </AlertDialogFooter>

      </AlertDialogContent>

    </AlertDialog>

  )

  /*** Remove custom section */

  const removeCustomSection = async (id: string) => {

    if (!project) return

    const updated = (project.custom_sections || []).filter(
      (section: any) => section.id !== id
    )

    await fetch("/api/projects/custom-section", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        project_id: project.id,
        custom_sections: updated
      })
    })

    refreshProject()

  }

  /* ------ add custom row. *********/

  const addCustomSection = async () => {

    if (!newSectionTitle || !project) return

    const id = `custom-${Date.now()}`

    const newSection =
      newSectionType === "textarea"
        ? {
          id,
          title: newSectionTitle,
          items: [
            {
              id: `${id}-field`,
              label: "Details",
              type: "predefined",
              fieldType: "textarea"
            }
          ],
          dynamic: false
        }
        : {
          id,
          title: newSectionTitle,
          items: [],
          dynamic: true,
          fieldType: "url"
        }

    const updated = [...(project.custom_sections || []), newSection]

    await fetch("/api/projects/custom-section", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        project_id: project.id,
        custom_sections: updated
      })
    })

    refreshProject()

    setNewSectionTitle("")
    setShowSectionForm(false)

  }

  /** Delete Team Modal */

  const deleteTeam = async (teamId: number) => {

    if (!project) return

    try {

      await fetch("/api/project-teams", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          project_id: project.id,
          team_id: teamId
        })
      })

      const refreshed = await fetch(`/api/projects/${slug}`, {
        cache: "no-store"
      })

      const data = await refreshed.json()

      setProject(data)

    } catch (err) {

      console.error("Delete team error", err)

    }

  }

  const refreshProject = async () => {

    const res = await fetch(`/api/projects/${slug}`, {
      cache: "no-store"
    })

    const data = await res.json()

    const normalizedTeams =
      data?.teams?.map((t: any) => ({
        id: t.id ?? t.team?.id,
        name: t.name ?? t.team?.name,
        members: t.members ?? []
      })) ?? []

    setProject({
      ...data,
      teams: normalizedTeams
    })

  }

  return (

    <div className="flex flex-col py-4 md:py-6">

      {/* HEADER */}

      <div className="flex items-center justify-between px-7 pb-2">

        <div className="flex gap-2">

          <Badge className="bg-sky-50 text-sky-700 py-2 px-3">
            {project.template_id
              ?.replace(/-/g, " ")
              ?.replace(/\b\w/g, (c) => c.toUpperCase())}
          </Badge>

          <Badge className="bg-purple-50 text-purple-700 py-2 px-3">
            <CalendarCheck />
            {new Date(project.created_at).toLocaleDateString("en-GB")}
          </Badge>

          <Select
            value={project.status}
            onValueChange={async (value) => {

              await fetch("/api/projects/status", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: project.id,
                  status: value
                })
              })

              setProject(prev =>
                prev ? { ...prev, status: value as Project["status"] } : prev
              )

            }}
          >

            <SelectTrigger className={`${statusStyles[project.status]} border-none text-xs rounded-full shadow-none`}>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>

              <SelectItem value="waiting">Waiting</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="onhold">On Hold</SelectItem>

            </SelectContent>

          </Select>

        </div>

        <Button
          variant="secondary"
          onClick={() => setClientAccessOpen(true)}
        >
          View Access
        </Button>

        <Button
          variant="gradient"
          onClick={() => setClientLinkOpen(true)}
        >
          <Copy /> Generate Client URL <ArrowUpRight />
        </Button>

        <ResetSubmissionsButton />

      </div>

      <Separator className="mt-4 bg-gray-100" />

      {/* MAIN GRID */}

      <div className="px-7 grid grid-cols-3">

        {/* LEFT SIDE */}

        <div className="col-span-2 border-r border-zinc-100 py-5 pr-5">

          <Accordion type="multiple" className="border divide-y rounded-lg">

            {[...templateSections, ...customSections].map((section: any) => (

              <div key={section.id} className="relative">

                {section.id.startsWith("custom") && checklistRole === "admin" && (
                  <button
                    onClick={() => removeCustomSection(section.id)}
                    className="absolute right-2 top-2 text-xs text-red-500"
                  >
                    Remove
                  </button>
                )}

                <ChecklistSection
                  section={section}
                  permission={checklistRole}
                  submissions={project.submissions}
                  projectId={project.id}
                />

              </div>

            ))}

          </Accordion>

          {/* Add Custom Section */}
          <div className="mt-4 space-y-4">
            {!showSectionForm && (
              <Button
                variant="secondary"
                className="text-xs"
                size="sm"
                onClick={() => setShowSectionForm(true)}
              >
                <Plus /> Add Custom Section
              </Button>
            )}

            {showSectionForm && (
              <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden">
                <div className="form-contents">
                  <Input
                    placeholder="Section Title"
                    value={newSectionTitle}
                    className="border-0 rounded-none border-b border-zinc-200 text-xs py-3! h-auto"
                    onChange={(e) =>
                      setNewSectionTitle(e.target.value)
                    }
                  />
                  <select
                    className="w-[98%] border rounded-md p-2 text-sm border-none py-3"
                    value={newSectionType}
                    onChange={(e) =>
                      setNewSectionType(
                        e.target.value as "textarea" | "url"
                      )
                    }
                  >
                    <option value="textarea">
                      Textarea
                    </option>
                    <option value="url">
                      File URL (Name + URL)
                    </option>
                  </select>
                </div>
                <div className="flex gap-2 bg-zinc-50 border-t border-zinc-200 p-3">
                  <Button onClick={addCustomSection} className="text-xs" size="sm">
                    Add Section
                  </Button>
                  <Button
                    variant="destructiveLight"
                    size="sm"
                    className="text-xs"
                    onClick={() => setShowSectionForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT SIDE */}

        <div className="p-5">

          {Object.keys(project.submissions || {}).length === 0 ? (

            <EmptyState
              icon={<Files />}
              title="No Files Uploaded"
              description="Client onboarding is pending"
            />

          ) : (

            <div className="flex items-center gap-3 flex-wrap">

              {Object.entries(project.submissions ?? {}).map(([key]) => (

                <div
                  key={key}
                  className="py-2 px-3 text-sm capitalize font-normal bg-violet-50 border border-violet-200 rounded-full flex items-center gap-2"
                >

                  {key}

                  <BadgeCheck
                    className="size-5"
                    fill="#00c951"
                    stroke="#fff"
                  />

                </div>

              ))}

              <Button variant="secondary">
                <ArrowDownToLine /> Download Assets
              </Button>

            </div>

          )}

        </div>

      </div>

      <Separator className="bg-gray-100" />

      {/* MEMBERS TABLE */}

      {teams.length === 0 && externalMembers.length === 0 ? (

        <EmptyState
          icon={<Users />}
          title="No Team Found"
          description="Create team or add existing team"
          buttonText="Add Team/Members"
          onClick={() => setOpenInvite(true)}
        />

      ) : (

        <div className="p-7">

          <div className="flex justify-between mb-5">

            <h3 className="text-base font-medium">
              Project Members
            </h3>

            <Button variant="gradient" onClick={() => setOpenInvite(true)}>
              <Plus /> Add Team / Member
            </Button>

          </div>

          <div className="rounded-xl border overflow-hidden">

            <Table>

              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead></TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {role !== "freelancer" &&
                  teams.map(team => (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {/* <AvatarImage src={team.avatar_src} /> */}
                            <AvatarFallback
                              className={getAvatarColor(String(team.id))}
                            >
                              {team.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          {team.name}
                        </div>
                      </TableCell>

                      <TableCell>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedTeam(team)
                            setTeamModalOpen(true)
                          }}
                        >
                          View Members
                        </Button>

                      </TableCell>

                      <TableCell>

                        <Badge className="bg-sky-100 text-sky-700">
                          Team
                        </Badge>

                      </TableCell>

                      <TableCell className="text-right">

                        <DeleteModal
                          title="Remove team?"
                          description={`Detach ${team.name} from this project. This will not delete the team.`}
                          onConfirm={() => deleteTeam(team.id)}
                          trigger={
                            <button className="text-red-500 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          }
                        />

                      </TableCell>

                    </TableRow>

                  ))
                }

                {externalMembers.map(member => (

                  <TableRow key={member.id}>

                    <TableCell>

                      <div className="flex items-center gap-3">

                        <Avatar className="h-8 w-8">

                          <AvatarFallback
                            className={getAvatarColor(String(member.id))}
                          >
                            {member.name[0]}
                          </AvatarFallback>

                        </Avatar>

                        {member.name}

                      </div>

                    </TableCell>

                    <TableCell>{member.role}</TableCell>

                    <TableCell>

                      <Badge className="bg-amber-100 text-amber-700">
                        External
                      </Badge>

                    </TableCell>

                    <TableCell className="text-right">

                      <DeleteModal
                        title="Delete member?"
                        description={`Remove ${member.name}`}
                        onConfirm={() => deleteMember(member.id)}
                        trigger={
                          <Trash2 className="h-4 w-4 text-red-500 cursor-pointer" />
                        }
                      />

                    </TableCell>

                  </TableRow>

                ))}

              </TableBody>

            </Table>

          </div>

        </div>

      )}

      {/* ADD TEAM / MEMBER DIALOG */}

      <Dialog open={openInvite} onOpenChange={setOpenInvite}>

        <DialogContent>

          <DialogHeader>
            <DialogTitle>Add Team or Member</DialogTitle>
          </DialogHeader>

          <Select
            value={inviteType}
            onValueChange={(v: "member" | "team") => setInviteType(v)}
          >

            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>

              <SelectItem value="member">
                Add External Member
              </SelectItem>
              {role !== "freelancer" && (
                <SelectItem value="team">
                  Add Existing Team
                </SelectItem>
              )}

            </SelectContent>

          </Select>

          {inviteType === "team" && (

            <Select
              value={selectedTeamId}
              onValueChange={setSelectedTeamId}
            >

              <SelectTrigger>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>

              <SelectContent>

                {teamsList.map(team => (

                  <SelectItem
                    key={team.id}
                    value={String(team.id)}
                  >
                    {team.name}
                  </SelectItem>

                ))}

              </SelectContent>

            </Select>

          )}

          {inviteType === "member" && (

            <div className="space-y-3">

              <Input
                placeholder="Member name"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
              />

              <Input
                placeholder="Role"
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
              />

            </div>

          )}

          <DialogFooter>

            <Button
              disabled={
                inviteType === "member"
                  ? !newMemberName || !newMemberRole
                  : !selectedTeamId
              }
              onClick={
                inviteType === "member"
                  ? addExternalMember
                  : addTeam
              }
            >
              <Plus /> Add
            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>

      <Dialog open={teamModalOpen} onOpenChange={setTeamModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTeam?.name} Members</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedTeam?.members && selectedTeam.members.length > 0 ? (
              selectedTeam?.members?.map((member: any) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 border p-3 rounded-lg"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback
                      className={getAvatarColor(String(member.id))}
                    >
                      {member.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {member.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {member.team_role} • {member.designation}
                    </span>
                  </div>
                </div>
              ))
            ) : (

              <div className="text-sm text-muted-foreground text-center py-6">
                No members in this team
              </div>

            )}
          </div>
        </DialogContent>
      </Dialog>

      <ClientLinkModal
        open={clientLinkOpen}
        setOpen={setClientLinkOpen}
        project={project}
        refreshProject={refreshProject}
      />

      <ClientAccessModal
        open={clientAccessOpen}
        setOpen={setClientAccessOpen}
        project={project}
      />

    </div>

  )

}