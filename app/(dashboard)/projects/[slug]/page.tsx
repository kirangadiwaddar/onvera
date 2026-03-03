"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import type { Project } from "@/types/project"
import { templateStructure } from "@/lib/template-structure"
import { Accordion } from "@/components/ui/accordion"
import ChecklistSection from "@/components/checklist-section"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { ArrowDownToLine, BadgeCheck, Check, Files, Plus, Trash2, User, Users } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { getAvatarColor } from "@/lib/get-avatar-colors"

import { statusStyles, statusLabel } from "@/lib/project-status"
import { ArrowUpRight, Calendar, CalendarCheck, Copy } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { EmptyState } from "@/components/emptyState"



export default function ProjectDetailPage() {
  const { slug } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  const [customSections, setCustomSections] = useState<any[]>([])
  const [showSectionForm, setShowSectionForm] = useState(false)
  const [newSectionTitle, setNewSectionTitle] = useState("")
  const [newSectionType, setNewSectionType] = useState<"textarea" | "url">("textarea")

  const [openInvite, setOpenInvite] = useState(false)
  const [inviteType, setInviteType] = useState<"member" | "team">("member")

  const [newMemberName, setNewMemberName] = useState("")
  const [newMemberRole, setNewMemberRole] = useState("")
  const [customRole, setCustomRole] = useState("")
  const [selectedTeamId, setSelectedTeamId] = useState("")
  const [teams, setTeams] = useState<any[]>([])


  const removeCustomSection = (id: string) => {
    setCustomSections((prev) =>
      prev.filter((section) => section.id !== id)
    )
  }

  useEffect(() => {
    if (!slug) return

    fetch(`/api/projects/${slug}`, { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        setProject(data.project)
        setLoading(false)
      })
  }, [slug])

  useEffect(() => {
    const fetchTeams = async () => {
      const res = await fetch("/api/teams", { cache: "no-store" })
      const data = await res.json()
      setTeams(data.teams || [])
    }

    fetchTeams()
  }, [])

  if (loading) return <div className="p-6">Loading...</div>
  if (!project) return <div className="p-6">Project not found</div>

  const templateSections =
    templateStructure[project.templateId] || []

  const addCustomSection = () => {
    if (!newSectionTitle) return

    const newSection = {
      id: `custom-${Date.now()}`,
      title: newSectionTitle,
      items:
        newSectionType === "textarea"
          ? [
            {
              id: "custom-text",
              label: "Details",
              type: "predefined",
              fieldType: "textarea",
            },
          ]
          : [],
      dynamic: newSectionType === "url",
    }

    setCustomSections([...customSections, newSection])
    setNewSectionTitle("")
    setShowSectionForm(false)
  }






  const addExternalMember = () => {
    const finalRole =
      newMemberRole === "Other" ? customRole : newMemberRole

    if (!newMemberName || !finalRole) return

    const newMember = {
      id: Date.now().toString(),
      name: newMemberName,
      role: finalRole,
      isExternal: true,
    }

    setProject((prev) =>
      prev
        ? {
          ...prev,
          members: [...(prev.members || []), newMember],
        }
        : prev
    )

    setNewMemberName("")
    setNewMemberRole("")
    setCustomRole("")
    setOpenInvite(false)
  }
  const addTeam = () => {
    if (!selectedTeamId) return

    const team = teams.find((t) => t.id === selectedTeamId)
    if (!team) return

    setProject((prev) =>
      prev
        ? {
          ...prev,
          members: [...(prev.members || []), ...team.members],
        }
        : prev
    )

    setSelectedTeamId("")
    setOpenInvite(false)
  }

  function deleteMember(id: any): void {
    throw new Error("Function not implemented.")
  }

  return (
    <div className="flex flex-col py-4 md:py-6">
      <div className="flex flex-col lg:flex-row items-center justify-between px-7 pb-2 gap-4 lg:gap-5">
        {/* <h1 className="text-3xl font-semibold">
          {project.title}
        </h1> */}

        <div className="flex items-center gap-2">
          <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 py-2 px-3">{project.templateTitle}</Badge>
          <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-sky-300 py-2 px-3">
            <CalendarCheck />{" "}
            {new Date(project.createdAt).toLocaleDateString("en-GB")}
          </Badge>
          {project.status && (
            <Badge className={`${statusStyles[project.status]} py-2 px-3`}>
              {statusLabel[project.status]}
            </Badge>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              navigator.clipboard.writeText(
                `${window.location.origin}/onboarding/${project.slug}`
              )
            }
          >
            <Copy />Copy Link
          </Button>
          <Link href={`/onboarding/${project.slug}`} target="_blank">
            <Button variant="gradient">
              Generate Client URL <ArrowUpRight />
            </Button>
          </Link>
        </div>
      </div>
      <Separator className="mt-4 bg-gray-100" />

      <div className="px-7 py-0 grid grid-cols-3">
        <div className="left-block col-span-2 border-r border-zinc-100 h-full py-5 pb-7 pr-5">
          <h3 className="text-sm text-muted-foreground mb-6">
            Project Onboarding Checklist
          </h3>

          <Accordion type="multiple" className="border border-zinc-200 divide-y rounded-lg overflow-hidden">
            {[...templateSections, ...customSections].map(
              (section) => {
                const isCustom = section.id.startsWith("custom-")
                return (
                  <div key={section.id} className="relative">

                    {/* Remove button only for custom sections */}
                    {isCustom && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="absolute right-3 top-3.5 text-xs text-red-600 hover:underline mr-10">
                            Remove
                          </button>
                        </AlertDialogTrigger>

                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-base">
                              Delete "<span className="">{section.title}</span>"?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-sm">
                              This action cannot be undone. This will permanently remove this custom section.
                            </AlertDialogDescription>
                          </AlertDialogHeader>

                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeCustomSection(section.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    <ChecklistSection
                      section={section}
                      isAgency={true}
                      submissions={project.submissions}
                    />
                  </div>
                )
              }
            )}
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
        <div className="right-block p-5">
          {Object.keys(project.submissions || {}).length === 0 ? (
            <EmptyState icon={<Files />} title="No Files Uploaded" description="Client onboarding is pending" />
          ) :
            <div className="bg-white space-y-4">
              <h2 className="text-muted-foreground text-sm mb-6">
                Uploaded Files
              </h2>
              <div className="flex items-center gap-3 flex-wrap">
                {Object.entries(project.submissions || {}).map(([key]) => (
                  <div
                    key={key}
                    className="py-2 px-3 text-sm capitalize font-normal bg-violet-50 border border-violet-200 rounded-full flex items-center gap-2"
                  >
                    {key} <BadgeCheck className="size-5" fill="#00c951" stroke="#fff" />
                  </div>
                ))}
              </div>
                <Separator className="my-5 bg-gray-100 " />
                <Button className="py-2 px-3 text-sm capitalize font-normal flex items-center gap-2 h-auto bg-emerald-50 text-emerald-800" variant="secondary"><ArrowDownToLine /> Download Assets</Button>

            </div>
          }

        </div>
      </div>

      <Separator className=" bg-gray-100" />

      {project.members?.length === 0 ? (
        <EmptyState icon={<Users />} title="No Team Found" description="Create team or add existing team" buttonText="Add Team/Members" onClick={() => setOpenInvite(true)} />
      ) :
        <div className="p-7">
          <div className="title-flex flex items-center justify-between gap-3 mb-5">
            <h3 className="text-base font-medium">Team members in this project</h3>
            <div className="right-btns space-x-2">
              <Button variant="gradient" onClick={() => setOpenInvite(true)}><Plus />Add Team / Member</Button>
            </div>
          </div>
          <div className="rounded-xl border overflow-hidden">
            <Table className="[&_th]:px-5 [&_th]:py-3 [&_td]:px-5 [&_td]:py-3 text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead></TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {project.members?.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.image} />
                          <AvatarFallback className={`font-bold ${getAvatarColor(String(member.id))}`}>
                            {member.name.slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <span className="font-medium">
                          {member.name}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      {member.role || "-"}
                    </TableCell>

                    <TableCell className="space-x-2">
                      {member.isLead && (
                        <Badge className="px-2 py-1 text-xs bg-sky-100 text-sky-700 rounded-full">
                          Team Lead
                        </Badge>
                      )}
                      {member.isExternal && (
                        <Badge className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded-full">
                          External
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      {member.isExternal && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="text-red-500 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </AlertDialogTrigger>

                          <AlertDialogContent size="sm">
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                <div className="bg-destructive/10 p-2 rounded-full flex items-center justify-center w-14 h-14 mx-auto mb-5"><Trash2 className="size-6 text-destructive" /></div> Are you absolutely sure?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Removing <span className="text-red-700"> {member.name} - {member.role}</span> cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>

                            <AlertDialogFooter>
                              <AlertDialogCancel>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMember(member.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>}

        <Dialog open={openInvite} onOpenChange={setOpenInvite}>               
                <DialogContent className="space-y-6">
                  <DialogHeader>
                    <DialogTitle>Add Team or Member</DialogTitle>
                  </DialogHeader>

                  {/* Type Selector */}
                  <div className="flex items-center gap-2">
                    <Select
                      value={inviteType}
                      onValueChange={(value: "member" | "team") =>
                        setInviteType(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">
                          Add External Member
                        </SelectItem>
                        <SelectItem value="team">
                          Add Existing Team
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Select Existing Team */}
                  {inviteType === "team" && (
                    <div className="space-y-3">
                      <Select
                        value={selectedTeamId}
                        onValueChange={setSelectedTeamId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select team" />
                        </SelectTrigger>
                        <SelectContent>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  </div>

                  {/* External Member Form */}
                  {inviteType === "member" && (
                    <div className="space-y-3">
                      <div className=" flex items-center gap-2">
                      <Input
                        placeholder="Enter member name"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                      />

                      <Select
                        value={newMemberRole}
                        onValueChange={(value) => {
                          setNewMemberRole(value)
                          if (value !== "Other") {
                            setCustomRole("")
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Designer">Designer</SelectItem>
                          <SelectItem value="Developer">Developer</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      </div>

                      {newMemberRole === "Other" && (
                        <Input
                          placeholder="Enter custom role"
                          value={customRole}
                          onChange={(e) => setCustomRole(e.target.value)}
                          className="flex-1"
                        />
                      )}
                    </div>
                  )}                  

                  <DialogFooter>
                    <Button
                    variant="gradient"
                      onClick={
                        inviteType === "member"
                          ? addExternalMember
                          : addTeam
                      }
                    >
                      <Plus /> Add Team/Member
                    </Button>
                  </DialogFooter>

                </DialogContent>
              </Dialog>

    </div>
  )
}