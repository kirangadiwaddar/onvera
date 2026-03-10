"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import JSZip from "jszip"
import type { Project } from "@/types/project"
import { templateStructure } from "@/lib/template-structure"
import type { Section } from "@/lib/types"
import type { Team } from "@/types/team"
import { Accordion } from "@/components/ui/accordion"
import ChecklistSection from "@/components/checklist-section"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
import { BadgeCheck, Copy, Crown, Download, Files, Plus, Trash2, Users } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { CalendarCheck } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { EmptyState } from "@/components/emptyState"
import { LoadingState } from "@/components/loadingState"
import ClientAccessModal from "@/components/projects/client-access-modal"
import { useAuth } from "@/components/providers/auth-provider"
import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { toast } from "sonner"

const CUSTOM_SECTIONS_KEY = "__custom_sections"

function getCustomSectionsFromSubmissions(submissions?: Record<string, unknown>): Section[] {
  const raw = submissions?.[CUSTOM_SECTIONS_KEY]
  if (!Array.isArray(raw)) return []

  return raw
    .map((section) => {
      if (!section || typeof section !== "object") return null
      const candidate = section as {
        id?: unknown
        title?: unknown
        dynamic?: unknown
        items?: unknown[]
      }
      if (typeof candidate.id !== "string" || typeof candidate.title !== "string") return null
      const itemsRaw = Array.isArray(candidate.items) ? candidate.items : []
      const items = itemsRaw
        .map((item) => {
          if (!item || typeof item !== "object") return null
          const entry = item as { id?: unknown; label?: unknown; fieldType?: unknown }
          if (typeof entry.id !== "string" || typeof entry.label !== "string") return null
          if (entry.fieldType !== "upload" && entry.fieldType !== "url" && entry.fieldType !== "text" && entry.fieldType !== "textarea") return null
          return {
            id: entry.id,
            label: entry.label,
            type: "predefined" as const,
            fieldType: entry.fieldType,
          }
        })
        .filter(Boolean) as Section["items"]
      return {
        id: candidate.id,
        title: candidate.title,
        items,
        dynamic: Boolean(candidate.dynamic),
      }
    })
    .filter(Boolean) as Section[]
}

function getUploadedEntries(submissions: Record<string, unknown> | undefined, sections: Section[]) {
  if (!submissions) return []
  const entries: { label: string; url: string; preview?: string }[] = []
  const labelByItemId = new Map<string, string>()
  const titleBySectionId = new Map<string, string>()

  sections.forEach((section) => {
    titleBySectionId.set(section.id, section.title)
    section.items.forEach((item) => {
      const label = section.id.startsWith("custom-") ? section.title : item.label
      labelByItemId.set(item.id, label)
    })
  })

  Object.entries(submissions).forEach(([key, value]) => {
    if (key === CUSTOM_SECTIONS_KEY) return

    if (Array.isArray(value)) {
      value.forEach((row, index) => {
        if (!row || typeof row !== "object") return
        const rowObj = row as { name?: unknown; url?: unknown }
        if (typeof rowObj.url === "string" && rowObj.url.trim()) {
          const sectionTitle = titleBySectionId.get(key)
          entries.push({
            label:
              typeof rowObj.name === "string" && rowObj.name.trim()
                ? rowObj.name
                : sectionTitle
                  ? `${sectionTitle} ${index + 1}`
                  : `${key}-${index + 1}`,
            url: rowObj.url,
          })
        }
      })
      return
    }

    if (!value || typeof value !== "object") return
    const field = value as { value?: unknown; preview?: unknown }
    if (typeof field.value !== "string" || !field.value.trim()) return
    entries.push({
      label: labelByItemId.get(key) ?? key,
      url: field.value,
      preview: typeof field.preview === "string" ? field.preview : undefined,
    })
  })

  return entries
}

function canOpenLink(value?: string) {
  if (!value) return false
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")
}

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "file"
}

function getDataUrlExtension(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);/)
  if (!match) return "bin"
  const mime = match[1]
  if (mime.includes("png")) return "png"
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg"
  if (mime.includes("svg")) return "svg"
  if (mime.includes("webp")) return "webp"
  if (mime.includes("pdf")) return "pdf"
  return "bin"
}

function extractFileName(value: string) {
  const normalized = value.split("?")[0]
  const parts = normalized.split("/")
  const candidate = parts[parts.length - 1] || ""
  return candidate.trim()
}

function hasFileExtension(value: string) {
  return /\.[a-z0-9]{2,8}$/i.test(value)
}



export default function ProjectDetailPage() {
  const { user, profile } = useAuth()
  const { slug } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  const [customSections, setCustomSections] = useState<Section[]>([])
  const [showSectionForm, setShowSectionForm] = useState(false)
  const [newSectionTitle, setNewSectionTitle] = useState("")
  const [newSectionType, setNewSectionType] = useState<"textarea" | "url">("textarea")

  const [openInvite, setOpenInvite] = useState(false)
  const [inviteType, setInviteType] = useState<"member" | "team">("member")

  const [newMemberName, setNewMemberName] = useState("")
  const [newMemberDesignation, setNewMemberDesignation] = useState("")
  const [newMemberEmail, setNewMemberEmail] = useState("")
  const [selectedTeamId, setSelectedTeamId] = useState("")
  const [teams, setTeams] = useState<Team[]>([])
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [submissionsSaving, setSubmissionsSaving] = useState(false)
  const [downloadingAssets, setDownloadingAssets] = useState(false)
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [viewTeam, setViewTeam] = useState<Team | null>(null)


  useEffect(() => {
    if (!slug) return

    fetchWithAuth(`/api/projects/${slug}`, { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        setProject(data.project)
        setCustomSections(getCustomSectionsFromSubmissions(data.project?.submissions))
        setLoading(false)
      })
  }, [slug])

  useEffect(() => {
    const fetchTeams = async () => {
      const res = await fetchWithAuth("/api/teams", { cache: "no-store" })
      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { message?: string } | null
        toast.error(payload?.message || "Unable to load teams")
        setTeams([])
        return
      }
      const data = await res.json()
      setTeams((data.teams || []) as Team[])
    }

    fetchTeams()
  }, [])

  const availableTeams = teams.filter((team) => !project?.teamIds?.includes(team.id))

  useEffect(() => {
    if (!openInvite || inviteType !== "team") return
    if (!selectedTeamId && availableTeams.length > 0) {
      setSelectedTeamId(String(availableTeams[0].id))
    }
  }, [availableTeams, inviteType, openInvite, selectedTeamId])

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState title="Loading Project" description="Fetching project details..." />
      </div>
    )
  }
  if (!project) {
    return (
      <div className="p-6">
        <EmptyState title="Project Not Found" description="We couldn't find this project." />
      </div>
    )
  }

  const currentRole = (profile?.role || user?.user_metadata?.role || null) as string | null
  const restrictedRole = currentRole === "project_member" || currentRole === "team_member"
  const currentEmail = (user?.email || "").toLowerCase()
  const isLeadMember = Boolean(
    project.members?.some(
      (member: { isLead?: boolean; email?: string }) =>
        member.isLead && typeof member.email === "string" && member.email.toLowerCase() === currentEmail,
    ),
  )
  const canEditProject = !restrictedRole
  const canManageChecklist = canEditProject || isLeadMember
  const canSeeAccessToken = isLeadMember || !restrictedRole
  const assignedTeams = Array.isArray(project.teams) ? project.teams : []
  const externalMembers = project.members?.filter((member) => member.isExternal) ?? []
  const inviteBaseUrl =
    typeof window !== "undefined" ? `${window.location.origin}/register` : ""
  const buildInviteUrl = (token?: string | null, role = "project_member") => {
    if (!token || !inviteBaseUrl) return ""
    const params = new URLSearchParams({ role })
    return `${inviteBaseUrl}?${params.toString()}#inviteToken=${encodeURIComponent(token)}`
  }

  const templateSections =
    templateStructure[project.templateId] || []
  const checklistSections = [...templateSections, ...customSections]
  const completedSections = checklistSections.filter(
    (section) => project.submissions?.[`__section_complete:${section.id}`] === true,
  ).length
  const checklistProgress =
    checklistSections.length === 0
      ? 0
      : Math.min(Math.round((completedSections / checklistSections.length) * 100), 100)

  const addCustomSection = () => {
    if (!newSectionTitle) return

    const sectionId = `custom-${Date.now()}`
    const newSection = {
      id: sectionId,
      title: newSectionTitle,
      items:
        newSectionType === "textarea"
          ? [
            {
              id: `${sectionId}-text`,
              label: "Details",
              type: "predefined" as const,
              fieldType: "textarea" as const,
            },
          ]
          : [],
      dynamic: newSectionType === "url",
    }

    const nextSections = [...customSections, newSection]
    setCustomSections(nextSections)
    if (project) {
      void persistSubmissions({
        ...(project.submissions || {}),
        [CUSTOM_SECTIONS_KEY]: nextSections,
      })
    }
    setNewSectionTitle("")
    setShowSectionForm(false)
  }






  const addExternalMember = async () => {
    if (!newMemberName || !newMemberDesignation || !newMemberEmail) return
    setInviteSubmitting(true)

    const tokenBytes = new Uint8Array(12)
    crypto.getRandomValues(tokenBytes)
    const accessToken = Array.from(tokenBytes, (byte) => byte.toString(16).padStart(2, "0")).join("")

    const newMember = {
      id: Date.now(),
      name: newMemberName,
      role: newMemberDesignation,
      email: newMemberEmail.trim().toLowerCase(),
      accessToken,
      image: "",
      isExternal: true,
    }

    const currentExtraMembers = Array.isArray(project.extraMembers) ? project.extraMembers : []
    const nextExtraMembers = [...currentExtraMembers, newMember]

    try {
      const response = await fetchWithAuth(`/api/projects/${project.slug}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          extraMembers: nextExtraMembers,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to add external member")
      }

      const data = await response.json()
      if (data?.project) {
        setProject(data.project)
      }

      const inviteResponse = await fetchWithAuth("/api/invitations/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: newMember.email,
          name: newMember.name,
          memberRole: "project_member",
          token: newMember.accessToken,
          contextName: project.title,
          contextType: "project",
        }),
      })
      const inviteData = await inviteResponse.json().catch(() => null) as { sent?: boolean; message?: string } | null
      if (!inviteResponse.ok || inviteData?.sent === false) {
        const errorMessage = inviteData?.message || "Failed to send invite email"
        console.warn(errorMessage)
        toast.error(errorMessage)
      }
      toast.success("Member invited")
    } catch (error) {
      console.error("Failed to add external member:", error)
      toast.error(error instanceof Error ? error.message : "Failed to add external member")
    }

    setNewMemberName("")
    setNewMemberDesignation("")
    setNewMemberEmail("")
    setOpenInvite(false)
    setInviteSubmitting(false)
  }

  const removeExternalMember = async (memberId: number) => {
    const currentExtraMembers = Array.isArray(project.extraMembers) ? project.extraMembers : []
    const nextExtraMembers = currentExtraMembers.filter((member) => member.id !== memberId)

    try {
      const response = await fetchWithAuth(`/api/projects/${project.slug}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          extraMembers: nextExtraMembers,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string } | null
        throw new Error(payload?.message || "Failed to remove external member")
      }

      const data = await response.json()
      if (data?.project) {
        setProject(data.project)
      }
      toast.success("Member removed")
    } catch (error) {
      console.error("Failed to remove external member:", error)
      toast.error(error instanceof Error ? error.message : "Failed to remove external member")
    }
  }

  const addTeam = async () => {
    if (!selectedTeamId) return

    const team = teams.find((t) => String(t.id) === selectedTeamId)
    if (!team) return

    const currentTeamIds = Array.isArray(project.teamIds) ? project.teamIds : []
    const nextTeamIds = Array.from(new Set([...currentTeamIds, team.id]))

    setInviteSubmitting(true)
    try {
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
        const payload = await response.json().catch(() => null) as { message?: string } | null
        throw new Error(payload?.message || "Failed to assign team")
      }

      const data = await response.json()
      if (data?.project) {
        setProject(data.project)
      }
      toast.success("Team added to project")
    } catch (error) {
      console.error("Failed to assign team:", error)
      toast.error(error instanceof Error ? error.message : "Failed to assign team")
    }

    setSelectedTeamId("")
    setOpenInvite(false)
    setInviteSubmitting(false)
  }

  const persistSubmissions = async (nextSubmissions: Record<string, unknown>) => {
    if (!project) return

    setProject((prev) => (prev ? { ...prev, submissions: nextSubmissions } : prev))
    setSubmissionsSaving(true)
    try {
      const response = await fetchWithAuth(`/api/projects/${project.slug}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          submissions: nextSubmissions,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null) as { message?: string } | null
        throw new Error(errorData?.message || "Failed to persist submissions")
      }

      const data = (await response.json()) as { project: Project }
      if (data.project) {
        setProject(data.project)
      }
    } catch (error) {
      console.error("Failed to save submissions:", error)
      window.alert(error instanceof Error ? error.message : "Failed to save checklist updates")
    } finally {
      setSubmissionsSaving(false)
    }
  }

  const removeAndPersistCustomSection = (sectionId: string) => {
    const nextSections = customSections.filter((section) => section.id !== sectionId)
    setCustomSections(nextSections)
    if (project) {
      void persistSubmissions({
        ...(project.submissions || {}),
        [CUSTOM_SECTIONS_KEY]: nextSections,
      })
    }
  }

  const handleStatusChange = async (nextStatus: Project["status"]) => {
    if (!project || nextStatus === project.status) return

    setStatusUpdating(true)
    try {
      const response = await fetchWithAuth(`/api/projects/${project.slug}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string } | null
        throw new Error(payload?.message || "Failed to update project status")
      }

      const data = (await response.json()) as { project: Project }
      if (data.project) {
        setProject(data.project)
      }
      toast.success("Status updated")
    } catch (error) {
      console.error("Status update failed:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update project status")
    } finally {
      setStatusUpdating(false)
    }
  }

  const downloadAssetsBundle = async () => {
    if (!project) return
    setDownloadingAssets(true)
    try {
      const sections = [
        ...(templateStructure[project.templateId] || []),
        ...customSections,
      ]
      const folderByItemId: Record<string, string> = {}
      const folderByDynamicId: Record<string, string> = {}

      sections.forEach((section) => {
        const folder = safeFileName(section.title || section.id)
        section.items.forEach((item) => {
          folderByItemId[item.id] = folder
        })
        if (section.dynamic) {
          folderByDynamicId[section.id] = folder
        }
      })

      const zip = new JSZip()
      const submissions = (project.submissions || {}) as Record<string, unknown>

      for (const [key, raw] of Object.entries(submissions)) {
        if (key === CUSTOM_SECTIONS_KEY) continue

        if (Array.isArray(raw)) {
          const folder = folderByDynamicId[key] || safeFileName(key)
          raw.forEach((row, index) => {
            if (!row || typeof row !== "object") return
            const rowData = row as { name?: unknown; url?: unknown }
            const rowName = typeof rowData.name === "string" && rowData.name.trim() ? rowData.name.trim() : `document-${index + 1}`
            const rowUrl = typeof rowData.url === "string" ? rowData.url.trim() : ""
            if (!rowUrl) return
            zip.file(`${folder}/${safeFileName(rowName)}.url.txt`, rowUrl)
          })
          continue
        }

        if (!raw || typeof raw !== "object") continue
        const value = raw as { value?: unknown; preview?: unknown }
        const textValue = typeof value.value === "string" ? value.value.trim() : ""
        if (!textValue) continue
        const folder = folderByItemId[key] || "misc"

        const preview = typeof value.preview === "string" ? value.preview : ""
        if (preview.startsWith("data:")) {
          const preferredName = hasFileExtension(textValue) ? textValue : ""
          const ext = preferredName ? preferredName.split(".").pop() || "bin" : getDataUrlExtension(preview)
          const base64 = preview.split(",")[1] || ""
          if (base64) {
            const finalName = preferredName || `${safeFileName(key)}.${ext}`
            zip.file(`${folder}/${safeFileName(finalName)}`, base64, { base64: true })
            continue
          }
        }

        if (canOpenLink(textValue)) {
          try {
            const response = await fetch(textValue)
            if (response.ok) {
              const blob = await response.blob()
              const candidateName = extractFileName(textValue) || `${safeFileName(key)}.bin`
              zip.file(`${folder}/${safeFileName(candidateName)}`, blob)
              continue
            }
          } catch {
            // fallback to URL pointer file
          }
          zip.file(`${folder}/${safeFileName(key)}.url.txt`, textValue)
          continue
        }

        zip.file(`${folder}/${safeFileName(key)}.txt`, textValue)
      }

      const blob = await zip.generateAsync({ type: "blob" })
      const downloadUrl = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = downloadUrl
      anchor.download = `${safeFileName(project.slug)}-assets.zip`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error("Failed to build assets bundle:", error)
    } finally {
      setDownloadingAssets(false)
    }
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
          {canEditProject ? (
            <Select
              value={project.status}
              onValueChange={(value) =>
                void handleStatusChange(value as Project["status"])
              }
              disabled={statusUpdating}
            >
              <SelectTrigger className={`text-xs py-2 px-3 border-none rounded-full h-auto! ${statusStyles[project.status]}`}>
                <SelectValue placeholder="Change status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="onhold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge className={`${statusStyles[project.status]} py-2 px-3`}>
              {statusLabel[project.status]}
            </Badge>
          )}
        </div>

        <div className="flex gap-3 flex-wrap items-center">
          {canManageChecklist ? (
            <ClientAccessModal projectSlug={project.slug} canManage={canManageChecklist} />
          ) : null}
          {submissionsSaving && (
            <span className="text-xs text-muted-foreground">Saving checklist...</span>
          )}
        </div>
      </div>
      <Separator className="mt-4 bg-border" />

      <div className="px-7 py-0 grid grid-cols-3">
        <div className="left-block col-span-2 border-r border-zinc-100 dark:border-zinc-700 h-full py-5 pb-7 pr-5">
          <h3 className="text-sm text-muted-foreground mb-6">
            Project Onboarding Checklist
          </h3>
          <div className="mb-5 rounded-lg border border-border bg-background/60 px-4 py-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Checklist progress</span>
              <span>{checklistProgress}%</span>
            </div>
            <Progress value={checklistProgress} className="mt-2 h-2" />
            <div className="mt-1 text-[11px] text-muted-foreground">
              {completedSections}/{checklistSections.length} sections completed
            </div>
          </div>

          <Accordion type="multiple" className="border border-zinc-200 divide-y rounded-lg overflow-hidden dark:border-white/10 dark:divide-white/10">
            {checklistSections.map(
              (section) => {
                const isCustom = section.id.startsWith("custom-")
                return (
                  <div key={section.id} className="relative">

                    {/* Remove button only for custom sections */}
                    {isCustom && canManageChecklist && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="absolute right-3 top-3.5 text-xs text-red-600 hover:underline mr-10">
                            Remove
                          </button>
                        </AlertDialogTrigger>

                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete Section?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently remove this custom section.
                            </AlertDialogDescription>
                          </AlertDialogHeader>

                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeAndPersistCustomSection(section.id)}
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
                      canEdit={canManageChecklist}
                      canModerate={canManageChecklist}
                      submissions={project.submissions}
                      onSubmissionsChange={(next) => void persistSubmissions(next)}
                    />
                  </div>
                )
              }
            )}
          </Accordion>

          {/* Add Custom Section */}
          {canManageChecklist && <div className="mt-4 space-y-4">
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
              <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden dark:border-white/10 dark:bg-white/5">
                <div className="form-contents">
                  <Input
                    placeholder="Section Title"
                    value={newSectionTitle}
                    className="border-0 rounded-none border-b border-zinc-200 text-xs py-3! h-auto dark:border-white/10"
                    onChange={(e) =>
                      setNewSectionTitle(e.target.value)
                    }
                  />
                  <select
                    className="w-[98%] border rounded-md p-2 text-sm border-none py-3 bg-transparent"
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
                <div className="flex gap-2 bg-zinc-50 border-t border-zinc-200 p-3 dark:border-white/10 dark:bg-white/5">
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
          </div>}
        </div>
        <div className="right-block p-5">
          {getUploadedEntries(project.submissions || {}, [...templateSections, ...customSections]).length === 0 ? (
            <EmptyState icon={<Files />} title="No Files Uploaded" description="Client onboarding is pending" />
          ) :
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 mb-6">
                <h2 className="text-muted-foreground text-sm">
                  Uploaded Files
                </h2>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  disabled={downloadingAssets}
                  onClick={() => void downloadAssetsBundle()}
                >
                  {downloadingAssets ? "Preparing..." : "Download Assets"}
                </Button>
              </div>


              <div className="flex items-center gap-3 flex-wrap">
                {getUploadedEntries(project.submissions || {}, [...templateSections, ...customSections]).map((entry) => {
                  const href = entry.preview || entry.url
                  const clickable = canOpenLink(href)
                  if (!clickable) {
                    return (
                      <div
                        key={`${entry.label}-${entry.url}`}
                        className="py-2 px-3 text-xs capitalize font-normal bg-violet-50 border border-violet-200 rounded-full flex items-center gap-2 dark:bg-violet-500/10 dark:border-violet-500/20 dark:text-violet-100"
                      >
                        {entry.label} <BadgeCheck className="size-4" fill="#00c951" stroke="#fff" />
                      </div>
                    )
                  }

                  return (
                    <a
                      key={`${entry.label}-${entry.url}`}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="py-2 px-3 text-xs capitalize font-normal bg-violet-50 border border-violet-200 rounded-full flex items-center gap-2 hover:bg-violet-100 dark:bg-violet-500/10 dark:border-violet-500/20 dark:text-violet-100 dark:hover:bg-violet-500/20"
                    >
                      {entry.label}
                      <BadgeCheck className="size-4" fill="#00c951" stroke="#fff" />
                      <Download className="size-3.5 text-violet-600 dark:text-violet-200" />
                    </a>
                  )
                })}
              </div>
            </div>
          }

        </div>
      </div>

      <Separator className=" bg-border" />

      <div className="p-7 space-y-8">
        <div>
          <div className="title-flex flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-medium">Teams in this project</h3>
              {assignedTeams.length === 0 && externalMembers.length > 0 ? (
                <Badge className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded-full border border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/20">
                  No teams added
                </Badge>
              ) : null}
            </div>
            {canEditProject && (
              <Button size="sm" variant="gradient" onClick={() => setOpenInvite(true)}>
                <Users className="mr-2 h-4 w-4" />
                Add Team/Members
              </Button>
            )}
          </div>

          {assignedTeams.length === 0 && externalMembers.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title="No Team Found"
              description="Create team or add existing team"
              buttonText={canEditProject ? "Add Team/Members" : undefined}
              onClick={() => setOpenInvite(true)}
            />
          ) : assignedTeams.length > 0 ? (
            <div className="rounded-xl border overflow-hidden">
              <Table className="[&_th]:px-5 [&_th]:py-3 [&_td]:px-5 [&_td]:py-3 text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedTeams.map((team) => {
                    const members = [
                      ...(team.lead ? [{ ...team.lead, isLead: true }] : []),
                      ...(team.members ?? []),
                    ]
                    return (
                      <TableRow key={team.id ?? team.slug ?? team.name}>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell>
                          <Badge
                            className={`px-2 py-1 text-xs rounded-full ${
                              team.status === "active"
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                : "bg-amber-100 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {team.status === "active" ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {team.lead ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={team.lead.image} />
                                <AvatarFallback className={`font-bold ${getAvatarColor(String(team.lead.id))}`}>
                                  {team.lead.name.slice(0, 1).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span>{team.lead.name}</span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{members.length}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="secondary" onClick={() => setViewTeam(team)}>
                            View Members
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </div>

        {externalMembers.length === 0 ? null : (
          <div>
            <div className="title-flex flex items-center justify-between gap-3 mb-5">
              <h3 className="text-base font-medium">External members in this project</h3>
            </div>
            <div className="rounded-xl border overflow-hidden">
              <Table className="[&_th]:px-5 [&_th]:py-3 [&_td]:px-5 [&_td]:py-3 text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Status</TableHead>
                    {canSeeAccessToken && <TableHead>Access Token</TableHead>}
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {externalMembers.map((member) => (
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
                        {member.email || "-"}
                      </TableCell>

                      <TableCell>
                        {member.role || "-"}
                      </TableCell>

                    <TableCell className="space-x-2">
                      {member.isLead && (
                        <Badge className="px-2 py-1 text-xs bg-sky-100 text-sky-700 rounded-full inline-flex items-center gap-1 border border-sky-200">
                          <Crown className="size-3.5" />
                          Team Lead
                        </Badge>
                      )}
                      {member.isExternal && (
                        <Badge className="px-2 py-1 text-xs bg-violet-50 text-violet-700 rounded-full dark:bg-violet-500/15 dark:text-violet-200">
                          External
                        </Badge>
                      )}
                      {!member.isLead && !member.isExternal && (
                        <Badge className="px-2 py-1 text-xs bg-zinc-100 text-zinc-700 rounded-full">
                          Member
                        </Badge>
                      )}
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

                    {canSeeAccessToken && (
                      <TableCell className="text-right">
                          {member.accessToken ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs"
                              onClick={() => {
                                const link = buildInviteUrl(member.accessToken, "project_member")
                                void navigator.clipboard.writeText(link || member.accessToken || "")
                                toast.success("Access link copied")
                              }}
                            >
                              <Copy className="size-3.5" /> Copy
                            </Button>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      )}

                      <TableCell className="text-right">
                      {canEditProject && member.isExternal && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="text-red-500 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </AlertDialogTrigger>

                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Remove {member.name} - {member.role}
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
                                  onClick={() => void removeExternalMember(member.id)}
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
          </div>
        )}
      </div>

      <Dialog open={openInvite} onOpenChange={setOpenInvite}>
        <DialogContent className="space-y-6">
          <DialogHeader>
            <DialogTitle>Add Team or Member</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
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

            {inviteType === "team" && (
              <div className="space-y-2">
                <Label>Select Team</Label>
                <Select
                  value={selectedTeamId}
                  onValueChange={setSelectedTeamId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                    <SelectContent>
                      {availableTeams.map((team) => (
                        <SelectItem key={team.id} value={String(team.id)}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableTeams.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No unassigned teams available.</p>
                  ) : null}
                </div>
              )}
          </div>

          {inviteType === "member" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Member Name</Label>
                <Input
                  placeholder="Enter member name"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Designation</Label>
                <Input
                  placeholder="Enter designation"
                  value={newMemberDesignation}
                  onChange={(e) => setNewMemberDesignation(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="Enter member email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                />
              </div>
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
              disabled={
                inviteType === "team"
                  ? inviteSubmitting || !selectedTeamId || availableTeams.length === 0
                  : inviteSubmitting || !newMemberName || !newMemberDesignation || !newMemberEmail
              }
            >
              {inviteSubmitting ? "Adding..." : <><Plus /> Add</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewTeam} onOpenChange={(open) => { if (!open) setViewTeam(null) }}>
        <DialogContent className="space-y-4">
          <DialogHeader>
            <DialogTitle>{viewTeam?.name || "Team Members"}</DialogTitle>
          </DialogHeader>
          {viewTeam ? (
            <div className="rounded-xl border overflow-hidden">
              <Table className="[&_th]:px-5 [&_th]:py-3 [&_td]:px-5 [&_td]:py-3 text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Status</TableHead>
                    {canSeeAccessToken && <TableHead>Access Token</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ...(viewTeam.lead ? [{ ...viewTeam.lead, isLead: true }] : []),
                    ...(viewTeam.members ?? []),
                  ].map((member) => (
                    <TableRow key={`${member.id}-${member.email ?? "member"}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={member.image} />
                            <AvatarFallback className={`font-bold ${getAvatarColor(String(member.id))}`}>
                              {member.name.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{member.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{member.email || "-"}</TableCell>
                      <TableCell>{member.role || "-"}</TableCell>
                      <TableCell>
                        {member.isLead ? (
                          <Badge className="px-2 py-1 text-xs bg-sky-100 text-sky-700 rounded-full inline-flex items-center gap-1 border border-sky-200">
                            <Crown className="size-3.5" />
                            Team Lead
                          </Badge>
                        ) : (
                          <Badge className="px-2 py-1 text-xs bg-zinc-100 text-zinc-700 rounded-full">
                            Member
                          </Badge>
                        )}
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
                      {canSeeAccessToken && (
                        <TableCell>
                          {member.accessToken ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs"
                              onClick={() => {
                                const link = buildInviteUrl(member.accessToken, "project_member")
                                void navigator.clipboard.writeText(link || member.accessToken || "")
                                toast.success("Access link copied")
                              }}
                            >
                              <Copy className="size-3.5" /> Copy
                            </Button>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

    </div>
  )
}
