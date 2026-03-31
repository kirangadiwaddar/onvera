"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import JSZip from "jszip"
import type { Project } from "@/types/project"
import type { Section } from "@/lib/types"
import type { Team } from "@/types/team"
import { Accordion } from "@/components/ui/accordion"
import ChecklistSection from "@/components/checklist-section"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
import { BadgeCheck, Check, Copy, Crown, Download, Files, Lock, MoreHorizontal, NotebookText, Pen, Plus, Trash, Trash2, TriangleAlert, Users, X } from "lucide-react"

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
import { Spinner } from "@/components/ui/spinner"
import { EmptyState } from "@/components/emptyState"
import { LoadingState } from "@/components/loadingState"
import ClientAccessModal from "@/components/projects/client-access-modal"
import { useAuth } from "@/components/providers/auth-provider"
import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { canUseNotes, canUseTeams, getPlanLimits, normalizePlan } from "@/lib/billing/plans"

type WorkspaceItem = {
  id: string
  name: string
  email: string | null
  plan: string | null
  role: "super_admin" | "team_lead" | "team_member" | "project_member"
}

const CUSTOM_SECTIONS_KEY = "__custom_sections"
const DEFAULT_NOTE_REACTIONS: string[] = []
const DEFAULT_MENTION_LIMIT = 6

type ProjectNote = {
  id: string
  authorName: string
  authorAvatar?: string
  authorEmail?: string
  message: string
  createdAt: string
  reactions?: {
    emoji: string
    count: number
    reacted: boolean
  }[]
  canEdit?: boolean
  canDelete?: boolean
}

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

function getLatestClientSubmissionAt(submissions?: Record<string, unknown>) {
  if (!submissions || typeof submissions !== "object") return null
  let latest: number | null = null

  const consider = (timestamp?: string) => {
    if (!timestamp) return
    const time = new Date(timestamp).getTime()
    if (!Number.isFinite(time)) return
    latest = latest === null ? time : Math.max(latest, time)
  }

  Object.entries(submissions).forEach(([key, raw]) => {
    if (key.startsWith("__section_complete:")) return
    if (Array.isArray(raw)) {
      raw.forEach((row) => {
        if (!row || typeof row !== "object") return
        const entry = row as { submittedAt?: unknown; status?: unknown }
        const status = typeof entry.status === "string" ? entry.status : "submitted"
        if (status !== "submitted") return
        if (typeof entry.submittedAt === "string") {
          consider(entry.submittedAt)
        }
      })
      return
    }
    if (!raw || typeof raw !== "object") return
    const entry = raw as { submittedAt?: unknown; status?: unknown }
    const status = typeof entry.status === "string" ? entry.status : "submitted"
    if (status !== "submitted") return
    if (typeof entry.submittedAt === "string") {
      consider(entry.submittedAt)
    }
  })

  return latest ? new Date(latest).toISOString() : null
}



export default function ProjectDetailPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const [notes, setNotes] = useState<ProjectNote[]>([])
  const [noteDraft, setNoteDraft] = useState("")
  const [notesLoading, setNotesLoading] = useState(false)
  const [noteSubmitting, setNoteSubmitting] = useState(false)
  const [notesSeenAt, setNotesSeenAt] = useState<string | null>(null)
  const { slug } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const lastClientSubmissionAtRef = useRef<string | null>(null)
  const hasLoadedRef = useRef(false)
  const lastSeenStorageKeyRef = useRef<string | null>(null)
  const latestClientSubmissionAtRef = useRef<string | null>(null)
  const submissionsSignatureRef = useRef<string>("")
  const lastProjectSlugRef = useRef<string | null>(null)

  const [customSections, setCustomSections] = useState<Section[]>([])
  const [openSectionId, setOpenSectionId] = useState<string>("")
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
  const [savingSubmissions, setSavingSubmissions] = useState(false)
  const [downloadingAssets, setDownloadingAssets] = useState(false)
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [removingTeamId, setRemovingTeamId] = useState<number | null>(null)
  const [openRemoveTeamId, setOpenRemoveTeamId] = useState<number | null>(null)
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null)
  const [openRemoveMemberId, setOpenRemoveMemberId] = useState<number | null>(null)
  const [viewTeam, setViewTeam] = useState<Team | null>(null)
  const [showCompletePrompt, setShowCompletePrompt] = useState(false)
  const [dismissedCompletePrompt, setDismissedCompletePrompt] = useState(false)
  const [hasChecklistUpdates, setHasChecklistUpdates] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [showNoteComposer, setShowNoteComposer] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editDrafts, setEditDrafts] = useState<Record<string, string>>({})
  const [reactionSubmitting, setReactionSubmitting] = useState<Record<string, boolean>>({})
  const [composerCursor, setComposerCursor] = useState(0)
  const [composerMention, setComposerMention] = useState<{ start: number; query: string; active: boolean } | null>(null)
  const [composerMentionIndex, setComposerMentionIndex] = useState(0)
  const [editCursor, setEditCursor] = useState<Record<string, number>>({})
  const [editMentionIndex, setEditMentionIndex] = useState<Record<string, number>>({})
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const [workspaceSwitching, setWorkspaceSwitching] = useState(true)
  const workspaceSwitchTimerRef = useRef<number | null>(null)
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
  const currentRole = (profile?.role || user?.user_metadata?.role || null) as string | null
  const currentWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId) || null
  const effectiveRole = currentWorkspace?.role || currentRole
  const restrictedRole = effectiveRole === "project_member" || effectiveRole === "team_member"
  const isSuperAdmin = effectiveRole === "super_admin"
  const currentPlan = normalizePlan(
    currentWorkspace?.plan ||
      project?.plan ||
      profile?.plan ||
      (typeof user?.user_metadata?.plan === "string" ? user.user_metadata.plan : null),
  )
  const planLimits = getPlanLimits(currentPlan)
  const notesEnabled = canUseNotes(currentPlan)
  const teamAccessEnabled = canUseTeams(currentPlan)

  const refreshProject = async () => {
    const response = await fetchWithAuth(`/api/projects/${slug}`, { cache: "no-store" })
    if (!response.ok) return null
    const data = await response.json().catch(() => null) as { project?: Project } | null
    if (data?.project) {
      setProject(data.project)
      return data.project
    }
    return null
  }

  const handleAddNote = async () => {
    if (!notesEnabled) {
      toast.error("Project notes are not available on this plan.")
      return
    }
    const trimmed = noteDraft.trim()
    if (!trimmed) return
    if (!slug) return
    if (noteSubmitting) return
    const authorName =
      profile?.full_name ||
      (typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "") ||
      user?.email ||
      "Team member"
    const authorAvatar =
      typeof user?.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : undefined

    try {
      setNoteSubmitting(true)
      const response = await fetchWithAuth(`/api/projects/${slug}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          authorName,
          authorAvatar,
          mentions: getMentionEmails(trimmed),
        }),
      })
      const payload = await response.json().catch(() => null) as { note?: ProjectNote; message?: string } | null
      if (!response.ok || !payload?.note) {
        throw new Error(payload?.message || "Unable to add note")
      }
      setNotes((prev) => [payload.note as ProjectNote, ...prev])
      setNoteDraft("")
      setShowNoteComposer(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to add note"
      toast.error(message)
    } finally {
      setNoteSubmitting(false)
    }
  }

  const startEditNote = (note: ProjectNote) => {
    setEditingNoteId(note.id)
    setEditDrafts((prev) => ({
      ...prev,
      [note.id]: note.message,
    }))
  }

  const cancelEditNote = () => {
    setEditingNoteId(null)
  }

  const saveEditNote = async (noteId: string) => {
    if (!notesEnabled) {
      toast.error("Project notes are not available on this plan.")
      return
    }
    const draft = (editDrafts[noteId] || "").trim()
    if (!draft) return
    if (!slug) return

    try {
      setNoteSubmitting(true)
      const response = await fetchWithAuth(`/api/projects/${slug}/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: draft, mentions: getMentionEmails(draft) }),
      })
      const payload = await response.json().catch(() => null) as { note?: ProjectNote; message?: string } | null
      if (!response.ok || !payload?.note) {
        throw new Error(payload?.message || "Unable to update note")
      }
      setNotes((prev) =>
        prev.map((note) =>
          note.id === noteId
            ? { ...(payload.note as ProjectNote), reactions: note.reactions }
            : note,
        ),
      )
      setEditingNoteId(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update note"
      toast.error(message)
    } finally {
      setNoteSubmitting(false)
    }
  }

  const deleteNote = async (noteId: string) => {
    if (!notesEnabled) {
      toast.error("Project notes are not available on this plan.")
      return
    }
    if (!slug) return
    if (!window.confirm("Delete this note? This cannot be undone.")) return

    try {
      setNoteSubmitting(true)
      const response = await fetchWithAuth(`/api/projects/${slug}/notes/${noteId}`, { method: "DELETE" })
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string } | null
        throw new Error(payload?.message || "Unable to delete note")
      }
      setNotes((prev) => prev.filter((note) => note.id !== noteId))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete note"
      toast.error(message)
    } finally {
      setNoteSubmitting(false)
    }
  }

  const toggleReaction = async (noteId: string, emoji: string) => {
    if (!notesEnabled) {
      toast.error("Project notes are not available on this plan.")
      return
    }
    if (!slug) return
    const key = `${noteId}:${emoji}`
    if (reactionSubmitting[key]) return

    try {
      setReactionSubmitting((prev) => ({ ...prev, [key]: true }))
      const response = await fetchWithAuth(`/api/projects/${slug}/notes/${noteId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      })
      const payload = await response.json().catch(() => null) as { reactions?: ProjectNote["reactions"]; message?: string } | null
      if (!response.ok || !payload?.reactions) {
        throw new Error(payload?.message || "Unable to update reaction")
      }
      setNotes((prev) =>
        prev.map((note) => (note.id === noteId ? { ...note, reactions: payload.reactions } : note)),
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update reaction"
      toast.error(message)
    } finally {
      setReactionSubmitting((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const formatNoteTime = (value: string) => {
    const date = new Date(value)
    if (!Number.isFinite(date.getTime())) return ""
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getMentionState = (value: string, cursor: number | null) => {
    if (cursor === null || cursor === undefined) return null
    const text = value.slice(0, cursor)
    const atIndex = text.lastIndexOf("@")
    if (atIndex === -1) return null
    const beforeChar = atIndex === 0 ? " " : text[atIndex - 1]
    if (beforeChar && !/\s/.test(beforeChar)) return null
    const query = text.slice(atIndex + 1)
    if (query.includes(" ") || query.includes("\n")) return null
    return { start: atIndex, query, active: true }
  }

  const applyMention = (value: string, start: number, cursor: number, mention: string) => {
    const before = value.slice(0, start)
    const after = value.slice(cursor)
    return `${before}@${mention} ${after}`
  }

  const getMentionEmails = (value: string) => {
    if (!value) return []
    const lower = value.toLowerCase()
    const emails = new Set<string>()
    mentionCandidates.forEach((candidate) => {
      if (!candidate.email) return
      const token = `@${candidate.name.toLowerCase()}`
      if (lower.includes(token)) {
        emails.add(candidate.email)
      }
    })
    return Array.from(emails)
  }

  const loadNotes = useCallback(
    async (currentSlug: string) => {
      try {
        setNotesLoading(true)
        const response = await fetchWithAuth(`/api/projects/${currentSlug}/notes`, { cache: "no-store" })
        const payload = await response.json().catch(() => null) as { notes?: ProjectNote[]; message?: string } | null
        if (!response.ok) {
          throw new Error(payload?.message || "Unable to load notes")
        }
        setNotes((payload?.notes || []) as ProjectNote[])
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load notes"
        toast.error(message)
        setNotes([])
      } finally {
        setNotesLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (!notesEnabled) return
    if (typeof window === "undefined") return
    if (!slug) return
    const key = `onvera:project-notes-seen:${slug}`
    const stored = window.localStorage.getItem(key)
    setNotesSeenAt(stored)
  }, [notesEnabled, slug])


  const loadProject = useCallback(
    async (silent = false) => {
      if (!slug) return
      try {
        if (!silent) setLoading(true)
        const res = await fetchWithAuth(`/api/projects/${slug}`, { cache: "no-store" })
        const data = await res.json().catch(() => null) as { project?: Project } | null
        if (!res.ok || !data?.project) {
          throw new Error("Failed to load project")
        }

        const latestClientSubmissionAt = getLatestClientSubmissionAt(data.project.submissions)
        latestClientSubmissionAtRef.current = latestClientSubmissionAt
        const storageKey = lastSeenStorageKeyRef.current
        const storedLastSeen =
          typeof window !== "undefined" && storageKey
            ? window.localStorage.getItem(storageKey)
            : null
        const previousClientSubmissionAt = lastClientSubmissionAtRef.current ?? storedLastSeen

        if (!previousClientSubmissionAt && latestClientSubmissionAt) {
          if (typeof window !== "undefined" && storageKey) {
            window.localStorage.setItem(storageKey, latestClientSubmissionAt)
          }
          lastClientSubmissionAtRef.current = latestClientSubmissionAt
        } else if (
          latestClientSubmissionAt &&
          previousClientSubmissionAt &&
          new Date(latestClientSubmissionAt).getTime() > new Date(previousClientSubmissionAt).getTime()
        ) {
          if (hasLoadedRef.current) {
            toast("Client updated this project", {
              id: `client-update-${slug}-${latestClientSubmissionAt}`,
              description: "New checklist submissions were added.",
            })
          }
          lastClientSubmissionAtRef.current = latestClientSubmissionAt
        } else if (latestClientSubmissionAt) {
          lastClientSubmissionAtRef.current = latestClientSubmissionAt
        }

        setProject(data.project)
        if (typeof window !== "undefined" && data.project?.slug) {
          const storedDismissed = window.localStorage.getItem(
            `onvera:project-complete-prompt-dismissed:${data.project.slug}`,
          )
          setDismissedCompletePrompt(storedDismissed === "true")
        }
        setCustomSections(getCustomSectionsFromSubmissions(data.project.submissions))
        setLoading(false)
        hasLoadedRef.current = true
      } catch {
        if (!silent) setLoading(false)
      }
    },
    [slug],
  )

  const supabase = useMemo(() => {
    try {
      return createClient()
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user?.id) return
    if (!slug) return
    lastSeenStorageKeyRef.current = `project_client_submission_seen:${slug}`
    void loadProject()
  }, [authLoading, loadProject, slug, user?.id])

  useEffect(() => {
    if (!notesEnabled) {
      setNotes([])
      return
    }
    if (authLoading) return
    if (!user?.id) return
    if (!slug) return
    void loadNotes(String(slug))
  }, [authLoading, loadNotes, notesEnabled, slug, user?.id])

  useEffect(() => {
    if (!notesEnabled) return
    if (authLoading) return
    if (!user?.id) return
    if (!slug) return
    if (typeof window === "undefined") return
    const interval = window.setInterval(() => {
      void loadNotes(String(slug))
    }, 10000)
    return () => window.clearInterval(interval)
  }, [authLoading, loadNotes, notesEnabled, slug, user?.id])

  useEffect(() => {
    if (!project) return
    const signature = JSON.stringify(project.submissions ?? {})
    if (!submissionsSignatureRef.current || lastProjectSlugRef.current !== project.slug) {
      submissionsSignatureRef.current = signature
      lastProjectSlugRef.current = project.slug
      setHasChecklistUpdates(false)
      return
    }
    if (signature !== submissionsSignatureRef.current) {
      submissionsSignatureRef.current = signature
      setHasChecklistUpdates(true)
      if (typeof window !== "undefined" && project?.slug) {
        window.localStorage.removeItem(
          `onvera:project-complete-prompt-dismissed:${project.slug}`,
        )
      }
      setDismissedCompletePrompt(false)
    }
  }, [project, project?.submissions])


  useEffect(() => {
    if (!slug || !supabase) return
    const channel = supabase
      .channel(`project-${slug}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects", filter: `slug=eq.${slug}` },
        () => void loadProject(true),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadProject, slug, supabase])

  useEffect(() => {
    if (!notesEnabled) return
    if (!slug || !supabase) return
    const channel = supabase
      .channel(`project-notes-${slug}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_notes", filter: `project_slug=eq.${slug}` },
        () => void loadNotes(String(slug)),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadNotes, notesEnabled, slug, supabase])

  useEffect(() => {
    if (authLoading) return
    if (!user?.id) return
    if (!openInvite || !teamAccessEnabled) return
    if (teams.length > 0) return

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
  }, [authLoading, openInvite, teamAccessEnabled, teams.length, user?.id])

  useEffect(() => {
    if (!notesEnabled) {
      setNotesOpen(false)
      setShowNoteComposer(false)
    }
  }, [notesEnabled])

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

  const availableTeams = teamAccessEnabled
    ? teams.filter((team) => !project?.teamIds?.includes(team.id))
    : []
  const hasAvailableTeams = teamAccessEnabled && availableTeams.length > 0

  useEffect(() => {
    if ((!teamAccessEnabled || !hasAvailableTeams) && inviteType === "team") {
      setInviteType("member")
      setSelectedTeamId("")
      return
    }
    if (!openInvite || inviteType !== "team") return
    if (!selectedTeamId && availableTeams.length > 0) {
      setSelectedTeamId(String(availableTeams[0].id))
    }
  }, [availableTeams, hasAvailableTeams, inviteType, openInvite, selectedTeamId, teamAccessEnabled])

  useEffect(() => {
    if (!openInvite || teamAccessEnabled) return
    void refreshProject()
  }, [openInvite, teamAccessEnabled])

  const isProjectLocked = Boolean(project?.isLocked)
  const canEditProject = !restrictedRole && !isProjectLocked
  const submissions = project?.submissions ?? {}
  const templateSections = useMemo(
    () => project?.templateStructure || [],
    [project?.templateStructure]
  )
  const checklistSections = useMemo(
    () => (project ? [...templateSections, ...customSections] : []),
    [customSections, project, templateSections]
  )

  useEffect(() => {
    if (checklistSections.length === 0) return
    setOpenSectionId((prev) =>
      prev && checklistSections.some((section) => section.id === prev) ? prev : ""
    )
  }, [checklistSections])

  const assignedTeams = Array.isArray(project?.teams)
    ? project!.teams.filter(Boolean)
    : []
  const visibleTeams = teamAccessEnabled ? assignedTeams : []
  const externalMembers = Array.isArray(project?.extraMembers)
    ? project!.extraMembers.filter((member) => member && member.isExternal && member.email)
    : []
  const externalMemberLimit = planLimits.maxExternalMembersPerProject
  const externalMemberLimitReached =
    externalMemberLimit !== null && externalMembers.length >= externalMemberLimit
  const mentionCandidates = useMemo(() => {
    const candidates = new Map<string, { name: string; image?: string; email?: string }>()
    const currentUserEmail = (user?.email || "").toLowerCase()
    const addCandidate = (member?: { name?: string; email?: string; image?: string }) => {
      if (!member) return
      const name = (member.name || "").trim()
      if (!name) return
      const key = (member.email || name).toLowerCase()
      if (currentUserEmail && key === currentUserEmail) return
      if (candidates.has(key)) return
      candidates.set(key, { name, image: member.image, email: member.email })
    }

    visibleTeams.forEach((team) => {
      addCandidate(team.lead as { name?: string; email?: string; image?: string })
      ;(team.members || []).forEach((member) =>
        addCandidate(member as { name?: string; email?: string; image?: string }),
      )
    })
    ;(project?.members || []).forEach((member) =>
      addCandidate(member as { name?: string; email?: string; image?: string }),
    )

    return Array.from(candidates.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [project?.members, visibleTeams])

  const filteredComposerMentions = useMemo(() => {
    if (!composerMention?.active) return []
    const query = composerMention.query.toLowerCase()
    const list = query
      ? mentionCandidates.filter((candidate) => candidate.name.toLowerCase().includes(query))
      : mentionCandidates
    return list.slice(0, DEFAULT_MENTION_LIMIT)
  }, [composerMention, mentionCandidates])

  const latestNoteAt = useMemo(() => (notes.length > 0 ? notes[0].createdAt : null), [notes])
  const hasNewNotes = useMemo(() => {
    if (!notesEnabled) return false
    if (!latestNoteAt) return false
    if (!notesSeenAt) return true
    return new Date(latestNoteAt).getTime() > new Date(notesSeenAt).getTime()
  }, [latestNoteAt, notesEnabled, notesSeenAt])

  useEffect(() => {
    if (!notesEnabled) return
    if (!notesOpen) return
    if (!latestNoteAt) return
    const nextSeen = latestNoteAt
    setNotesSeenAt(nextSeen)
    if (typeof window !== "undefined" && slug) {
      window.localStorage.setItem(`onvera:project-notes-seen:${slug}`, nextSeen)
    }
  }, [latestNoteAt, notesEnabled, notesOpen, slug])

  const highlightMentions = (value: string) => {
    if (!value) return value
    const candidates = mentionCandidates
      .map((candidate) => candidate.name)
      .sort((a, b) => b.length - a.length)
    if (candidates.length === 0) return value
    const parts: Array<string | { text: string; key: string }> = []
    let i = 0

    while (i < value.length) {
      const char = value[i]
      if (char !== "@") {
        parts.push(char)
        i += 1
        continue
      }
      let matched = false
      for (const name of candidates) {
        if (
          value
            .slice(i + 1, i + 1 + name.length)
            .toLowerCase() === name.toLowerCase()
        ) {
          const mentionText = value.slice(i, i + 1 + name.length)
          parts.push({ text: mentionText, key: `${mentionText}-${i}` })
          i += 1 + name.length
          matched = true
          break
        }
      }
      if (!matched) {
        parts.push(char)
        i += 1
      }
    }

    return parts.map((part, index) => {
      if (typeof part === "string") return part
      return (
        <span
          key={`${part.key}-${index}`}
          className="font-semibold text-sky-600 dark:text-sky-300"
        >
          {part.text}
        </span>
      )
    })
  }
  const totalSections = checklistSections.length
  const uploadedCount = checklistSections.filter((section) => {
    const hasRejected = section.dynamic
      ? (() => {
          const rows = submissions?.[section.id]
          if (!Array.isArray(rows) || rows.length === 0) return false
          return rows.some((row) => row && typeof row === "object" && (row as { status?: unknown }).status === "rejected")
        })()
      : section.items.some((item) => {
          const entry = submissions?.[item.id]
          if (!entry || typeof entry !== "object") return false
          return (entry as { status?: unknown }).status === "rejected"
        })
    if (hasRejected) return false
    if (section.dynamic) {
      const rows = submissions?.[section.id]
      if (!Array.isArray(rows) || rows.length === 0) return false
      return rows.some((row) => {
        if (!row || typeof row !== "object") return false
        const entry = row as { name?: unknown; url?: unknown }
        return typeof entry.name === "string"
          && entry.name.trim()
          && typeof entry.url === "string"
          && entry.url.trim()
      })
    }

    if (!section.items || section.items.length === 0) return false
    return section.items.every((item) => {
      const entry = submissions?.[item.id]
      if (!entry || typeof entry !== "object") return false
      const value = (entry as { value?: unknown }).value
      if (typeof value === "string") return value.trim().length > 0
      return Boolean(value)
    })
  }).length
  const checklistProgress =
    totalSections === 0
      ? 0
      : Math.min(Math.round((uploadedCount / totalSections) * 100), 100)
  const progressRadius = 22
  const progressStroke = 4
  const progressCircumference = 2 * Math.PI * progressRadius
  const progressOffset = progressCircumference * (1 - checklistProgress / 100)

  const getProgressStrokeColor = (value: number) => {
    if (value < 40) return "text-red-500"
    if (value < 80) return "text-amber-500"
    return "text-emerald-500"
  }

  const completionKeyBySection = useMemo(
    () =>
      new Map(
        checklistSections.map((section) => [
          section.id,
          `__section_complete:${section.id}`,
        ]),
      ),
    [checklistSections],
  )

  const allSectionsCompleted = checklistSections.every((section) => {
    const key = completionKeyBySection.get(section.id)
    if (!key) return false
    return submissions?.[key] === true
  })

  const shouldPromptForCompletion =
    Boolean(project) &&
    canEditProject &&
    project?.status !== "completed" &&
    checklistProgress === 100 &&
    allSectionsCompleted &&
    hasChecklistUpdates

  useEffect(() => {
    if (shouldPromptForCompletion && !dismissedCompletePrompt) {
      setShowCompletePrompt(true)
      return
    }
    setShowCompletePrompt(false)
  }, [dismissedCompletePrompt, shouldPromptForCompletion])

  const workspaceReady = !workspaceSwitching && (!workspaces.length || !!selectedWorkspaceId)

  if (loading || !workspaceReady) {
    return (
      <div className="p-6">
        <LoadingState title="Loading Project" description="Fetching project details..." />
      </div>
    )
  }
  if (!project) {
    return (
      <div className="p-6">
        <EmptyState icon={<TriangleAlert className="text-destructive" />} title="Project Not Found" description="We couldn't find this project." />
      </div>
    )
  }
  if (selectedWorkspaceId && project.createdBy && project.createdBy !== selectedWorkspaceId) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<TriangleAlert className="text-destructive" />}
          title="Wrong workspace"
          description="Switch the workspace from the sidebar to view this project."
        />
      </div>
    )
  }
  const currentEmail = (user?.email || "").toLowerCase()
  const isLeadMember = Boolean(
    project.members?.some(
      (member: { isLead?: boolean; email?: string }) =>
        member.isLead && typeof member.email === "string" && member.email.toLowerCase() === currentEmail,
    ),
  )
  const canManageChecklist = !isProjectLocked && (canEditProject || isLeadMember)
  const isProjectCompleted = project.status === "completed"
  const canSeeAccessToken = currentRole === "super_admin"
  const inviteBaseUrl =
    typeof window !== "undefined" ? `${window.location.origin}/invite` : ""
  const buildInviteUrl = (token?: string | null) => {
    if (!token || !inviteBaseUrl) return ""
    const params = new URLSearchParams({ token })
    return `${inviteBaseUrl}?${params.toString()}`
  }

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

    const latestProject = (await refreshProject()) || project
    const currentExtraMembers = Array.isArray(latestProject.extraMembers) ? latestProject.extraMembers : []
    if (planLimits.maxExternalMembersPerProject !== null) {
      const currentCount = currentExtraMembers.filter((member) => member?.isExternal && member.email).length
      if (currentCount >= planLimits.maxExternalMembersPerProject) {
        toast.error("External member limit reached for this plan.")
        setInviteSubmitting(false)
        return
      }
    }
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
      } else {
        toast.success("Member invited")
      }
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
    } finally {
      setRemovingMemberId(null)
      setOpenRemoveMemberId(null)
    }
  }


  const addTeam = async () => {
    if (!selectedTeamId) return
    if (!teamAccessEnabled) return

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

  const removeTeam = async (teamId: number) => {
    const currentTeamIds = Array.isArray(project.teamIds) ? project.teamIds : []
    const nextTeamIds = currentTeamIds.filter((id) => id !== teamId)

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
        throw new Error(payload?.message || "Failed to remove team")
      }

      const data = await response.json()
      if (data?.project) {
        setProject(data.project)
      }
      toast.success("Team removed from project")
    } catch (error) {
      console.error("Failed to remove team:", error)
      toast.error(error instanceof Error ? error.message : "Failed to remove team")
    } finally {
      setRemovingTeamId(null)
      setOpenRemoveTeamId(null)
    }
  }

  const persistSubmissions = async (nextSubmissions: Record<string, unknown>) => {
    if (!project) return

    setProject((prev) => (prev ? { ...prev, submissions: nextSubmissions } : prev))
    setSavingSubmissions(true)
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
      const message =
        error instanceof Error ? error.message : "Failed to save checklist updates"
      toast.error(message)
    } finally {
      setSavingSubmissions(false)
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
      if (nextStatus !== "completed") {
        setHasChecklistUpdates(false)
        if (typeof window !== "undefined" && project?.slug) {
          window.localStorage.removeItem(
            `onvera:project-complete-prompt-dismissed:${project.slug}`,
          )
        }
        setDismissedCompletePrompt(false)
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
        ...templateSections,
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
    <>
      <AlertDialog open={showCompletePrompt} onOpenChange={setShowCompletePrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark project as completed?</AlertDialogTitle>
            <AlertDialogDescription>
              The checklist is fully filled and all items are approved. Do you want to set this project to completed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDismissedCompletePrompt(true)
                setShowCompletePrompt(false)
                if (typeof window !== "undefined" && project?.slug) {
                  window.localStorage.setItem(
                    `onvera:project-complete-prompt-dismissed:${project.slug}`,
                    "true",
                  )
                }
              }}
            >
              Not now
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void handleStatusChange("completed")
                setShowCompletePrompt(false)
              }}
            >
              Yes, complete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col py-4 md:py-6">
      <div className="flex flex-col lg:flex-row items-center justify-between px-7 pb-2 gap-4 lg:gap-5">
        {/* <h1 className="text-3xl font-semibold">
          {project.title}
        </h1> */}

        <div className="flex items-center gap-2">
          <Badge className="py-2 px-3 text-cyan-900 bg-cyan-100 dark:bg-cyan-950 dark:text-white">
            {project.templateTitle}
          </Badge>
          <Badge className="bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-sky-300 py-2 px-3 overflow-hidden">
            <CalendarCheck />{" "}
            {new Date(project.createdAt).toLocaleDateString("en-GB")}
          </Badge>
          {isProjectLocked ? (
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200 py-2 px-3">
              <Lock className="size-4" />
              Locked
            </Badge>
          ) : null}
          {canEditProject ? (
            <Select
              value={project.status}
              onValueChange={(value) =>
                void handleStatusChange(value as Project["status"])
              }
              disabled={statusUpdating}
            >
              <SelectTrigger className={`text-xs font-medium py-2 px-3 border-none rounded-full h-auto! ${statusStyles[project.status]}`}>
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
          {notesEnabled ? (
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => setNotesOpen(true)}
            >
              <span className="relative inline-flex items-center gap-2">
                <NotebookText />
                Notes
                {hasNewNotes ? (
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                ) : null}
              </span>
            </Button>
          ) : null}
        </div>
      </div>
      <Separator className="mt-4 bg-border" />

      {notesEnabled ? (
        <Sheet
          open={notesOpen}
          onOpenChange={(open) => {
            setNotesOpen(open)
            if (!open) {
              setShowNoteComposer(false)
            }
          }}
        >
          <SheetContent
            side="right"
            className="w-[360px] max-w-[90vw]"
            showCloseButton={false}
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <SheetHeader className="border-b border-zinc-100 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <SheetTitle className="text-sm">Notes</SheetTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Shared Notes of this project.
                  </p>
                </div>
                <TooltipProvider delayDuration={300}>
                  <div className="flex items-center gap-2 pr-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-full focus-visible:ring-0 focus-visible:ring-offset-0"
                          onClick={() => setShowNoteComposer(true)}
                          aria-label="Add note"
                        >
                          <Plus className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Add note</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SheetClose asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-full border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                            aria-label="Close"
                          >
                            <X className="size-4" />
                          </Button>
                        </SheetClose>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Close</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>
            </SheetHeader>

          <div className="px-4">          
            {showNoteComposer || noteDraft.trim() ? (
              <div className="space-y-2">
              <div className="relative">
                <Textarea
                  value={noteDraft}
                  onChange={(event) => {
                    const value = event.target.value
                    const cursor = event.target.selectionStart ?? value.length
                    setNoteDraft(value)
                    setComposerCursor(cursor)
                    const mentionState = getMentionState(value, cursor)
                    setComposerMention(mentionState)
                    setComposerMentionIndex(0)
                  }}
                  onClick={(event) => {
                    const target = event.target as HTMLTextAreaElement
                    const cursor = target.selectionStart ?? target.value.length
                    setComposerCursor(cursor)
                    const mentionState = getMentionState(target.value, cursor)
                    setComposerMention(mentionState)
                    setComposerMentionIndex(0)
                  }}
                  onKeyUp={(event) => {
                    const target = event.currentTarget
                    const cursor = target.selectionStart ?? target.value.length
                    setComposerCursor(cursor)
                    const mentionState = getMentionState(target.value, cursor)
                    setComposerMention(mentionState)
                    setComposerMentionIndex(0)
                  }}
                  onKeyDown={(event) => {
                    if (!composerMention?.active || filteredComposerMentions.length === 0) return
                    if (event.key === "ArrowDown") {
                      event.preventDefault()
                      setComposerMentionIndex((prev) =>
                        (prev + 1) % filteredComposerMentions.length,
                      )
                    }
                    if (event.key === "ArrowUp") {
                      event.preventDefault()
                      setComposerMentionIndex((prev) =>
                        (prev - 1 + filteredComposerMentions.length) % filteredComposerMentions.length,
                      )
                    }
                    if (event.key === "Enter") {
                      event.preventDefault()
                      const candidate = filteredComposerMentions[composerMentionIndex]
                      if (!candidate) return
                      const next = applyMention(
                        noteDraft,
                        composerMention.start,
                        composerCursor,
                        candidate.name,
                      )
                      setNoteDraft(next)
                      setComposerMention(null)
                    }
                  }}
                  placeholder="Share an update with the team..."
                  className="min-h-[90px] text-xs"
                />
                {composerMention?.active && filteredComposerMentions.length > 0 && (
                  <div className="absolute left-0 top-full z-20 mt-2 w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-zinc-950">
                    <div className="text-[11px] text-muted-foreground px-2 pb-2">Mention someone</div>
                    <div className="space-y-1">
                      {filteredComposerMentions.map((candidate, index) => (
                        <button
                          key={candidate.name}
                          type="button"
                          onClick={() => {
                            const next = applyMention(
                              noteDraft,
                              composerMention.start,
                              composerCursor,
                              candidate.name,
                            )
                            setNoteDraft(next)
                            setComposerMention(null)
                          }}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs ${
                            index === composerMentionIndex
                              ? "bg-zinc-100 dark:bg-white/10"
                              : "hover:bg-zinc-100 dark:hover:bg-white/10"
                          }`}
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={candidate.image} />
                            <AvatarFallback className={`font-semibold ${getAvatarColor(candidate.name)}`}>
                              {candidate.name.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{candidate.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="destructiveLight"
                    onClick={() => {
                      setNoteDraft("")
                      setShowNoteComposer(false)
                    }}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="gradient"
                    disabled={!noteDraft.trim() || noteSubmitting}
                    onClick={handleAddNote}
                    className="text-xs"
                  >
                    {noteSubmitting ? "Posting..." : "Post Note"}
                  </Button>
                </div>
                <Separator className="my-4 bg-zinc-100 dark:bg-zinc-500/30" />
              </div>
            ) : (
              null
            )}

          </div>

          <div className="space-y-4 px-4">
            {notesLoading ? (
              <div className="text-xs text-muted-foreground">Loading notes...</div>
            ) : notes.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                No notes yet. Start the discussion with the team.
              </div>
            ) : (
              <div className="relative space-y-4">
                {notes.length > 1 ? (
                  <span className="absolute left-3.5 top-2 bottom-5 w-px border-l border-dashed border-zinc-200 dark:border-white/20" />
                ) : null}
                {notes.map((note) => (
                  <div key={note.id} className="flex gap-3">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={note.authorAvatar} />
                      <AvatarFallback
                        className={`font-semibold ${getAvatarColor(note.authorEmail || note.authorName)}`}
                      >
                        {note.authorName.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-zinc-800 dark:text-zinc-100">
                            <span className="font-semibold">{note.authorName}</span>{" "}
                            {editingNoteId === note.id ? null : (
                              <span className="text-muted-foreground">
                                {highlightMentions(note.message)}
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {formatNoteTime(note.createdAt)}
                          </p>
                        </div>
                        {(note.canEdit || note.canDelete) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {note.canEdit && (
                                <DropdownMenuItem onClick={() => startEditNote(note)} className="text-xs">
                                  <Pen /> Edit
                                </DropdownMenuItem>
                              )}
                              {note.canDelete && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem variant="destructive" onClick={() => deleteNote(note.id)} className="text-xs">
                                    <Trash /> Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      {editingNoteId === note.id ? (
                        <div className="mt-2 space-y-2">
                          <div className="relative">
                            <Textarea
                              value={editDrafts[note.id] ?? ""}
                              onChange={(event) => {
                                const value = event.target.value
                                const cursor = event.target.selectionStart ?? value.length
                                setEditDrafts((prev) => ({
                                  ...prev,
                                  [note.id]: value,
                                }))
                                setEditCursor((prev) => ({ ...prev, [note.id]: cursor }))
                                setEditMentionIndex((prev) => ({ ...prev, [note.id]: 0 }))
                              }}
                              onClick={(event) => {
                                const target = event.target as HTMLTextAreaElement
                                const cursor = target.selectionStart ?? target.value.length
                                setEditCursor((prev) => ({ ...prev, [note.id]: cursor }))
                                setEditMentionIndex((prev) => ({ ...prev, [note.id]: 0 }))
                              }}
                              onKeyUp={(event) => {
                                const target = event.currentTarget
                                const cursor = target.selectionStart ?? target.value.length
                                setEditCursor((prev) => ({ ...prev, [note.id]: cursor }))
                                setEditMentionIndex((prev) => ({ ...prev, [note.id]: 0 }))
                              }}
                              onKeyDown={(event) => {
                                const currentValue = editDrafts[note.id] ?? ""
                                const cursor = editCursor[note.id] ?? currentValue.length
                                const mentionState = getMentionState(currentValue, cursor)
                                if (!mentionState?.active) return
                                const query = mentionState.query.toLowerCase()
                                const list = (query
                                  ? mentionCandidates.filter((candidate) =>
                                      candidate.name.toLowerCase().includes(query),
                                    )
                                  : mentionCandidates
                                ).slice(0, DEFAULT_MENTION_LIMIT)
                                if (list.length === 0) return

                                if (event.key === "ArrowDown") {
                                  event.preventDefault()
                                  setEditMentionIndex((prev) => ({
                                    ...prev,
                                    [note.id]: ((prev[note.id] ?? 0) + 1) % list.length,
                                  }))
                                }
                                if (event.key === "ArrowUp") {
                                  event.preventDefault()
                                  setEditMentionIndex((prev) => ({
                                    ...prev,
                                    [note.id]:
                                      ((prev[note.id] ?? 0) - 1 + list.length) % list.length,
                                  }))
                                }
                                if (event.key === "Enter") {
                                  event.preventDefault()
                                  const index = editMentionIndex[note.id] ?? 0
                                  const candidate = list[index]
                                  if (!candidate) return
                                  const next = applyMention(
                                    currentValue,
                                    mentionState.start,
                                    cursor,
                                    candidate.name,
                                  )
                                  setEditDrafts((prev) => ({
                                    ...prev,
                                    [note.id]: next,
                                  }))
                                }
                              }}
                              className="min-h-[90px] text-xs"
                            />
                            {(() => {
                              const currentValue = editDrafts[note.id] ?? ""
                              const cursor = editCursor[note.id] ?? currentValue.length
                              const mentionState = getMentionState(currentValue, cursor)
                              if (!mentionState?.active) return null
                              const query = mentionState.query.toLowerCase()
                              const list = (query
                                ? mentionCandidates.filter((candidate) =>
                                    candidate.name.toLowerCase().includes(query),
                                  )
                                : mentionCandidates
                              ).slice(0, DEFAULT_MENTION_LIMIT)
                              if (list.length === 0) return null
                              const selectedIndex = editMentionIndex[note.id] ?? 0

                              return (
                                <div className="absolute left-0 top-full z-20 mt-2 w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-zinc-950">
                                  <div className="text-[11px] text-muted-foreground px-2 pb-2">Mention someone</div>
                                  <div className="space-y-1">
                                    {list.map((candidate, index) => (
                                      <button
                                        key={candidate.name}
                                        type="button"
                                        onClick={() => {
                                          const next = applyMention(
                                            currentValue,
                                            mentionState.start,
                                            cursor,
                                            candidate.name,
                                          )
                                          setEditDrafts((prev) => ({
                                            ...prev,
                                            [note.id]: next,
                                          }))
                                        }}
                                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs ${
                                          index === selectedIndex
                                            ? "bg-zinc-100 dark:bg-white/10"
                                            : "hover:bg-zinc-100 dark:hover:bg-white/10"
                                        }`}
                                      >
                                        <Avatar className="h-6 w-6">
                                          <AvatarImage src={candidate.image} />
                                          <AvatarFallback className={`font-semibold ${getAvatarColor(candidate.name)}`}>
                                            {candidate.name.slice(0, 1).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="truncate">{candidate.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={cancelEditNote}>
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              disabled={!((editDrafts[note.id] || "").trim()) || noteSubmitting}
                              onClick={() => saveEditNote(note.id)}
                            >
                              {noteSubmitting ? "Saving..." : "Save"}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}

            
          </div>
          </SheetContent>
        </Sheet>
      ) : null}

      <div className="px-7 py-0 grid grid-cols-3">
        <div className="left-block col-span-2 border-r border-zinc-100 dark:border-zinc-700 h-full py-5 pb-7 pr-5">
          <div className="flex items-center justify-between gap-6 mb-6">
            <div>
              <h3 className="text-sm text-muted-foreground">
                Project Onboarding Checklist
              </h3>
              <div className="text-xs text-muted-foreground mt-1">
                {uploadedCount}/{totalSections} sections uploaded
              </div>
            </div>
            <div className="relative h-14 w-14">
              <svg viewBox="0 0 52 52" className="-rotate-90 h-14 w-14">
                <circle
                  cx="26"
                  cy="26"
                  r={progressRadius}
                  stroke="currentColor"
                  strokeWidth={progressStroke}
                  fill="none"
                  className="text-zinc-200 dark:text-zinc-700"
                />
                <circle
                  cx="26"
                  cy="26"
                  r={progressRadius}
                  stroke="currentColor"
                  strokeWidth={progressStroke}
                  strokeLinecap="round"
                  fill="none"
                  className={getProgressStrokeColor(checklistProgress)}
                  strokeDasharray={progressCircumference}
                  strokeDashoffset={progressOffset}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-zinc-700 dark:text-zinc-200">
                {checklistProgress === 100 ? (
                  <Check strokeWidth={3} className="size-6 text-emerald-500" />
                ) : (
                  `${checklistProgress}%`
                )}
              </div>
            </div>
          </div>

          <Accordion
            type="single"
            collapsible
            value={openSectionId}
            onValueChange={(value) => setOpenSectionId(value || "")}
            className="border border-zinc-200 divide-y rounded-lg overflow-hidden dark:border-white/10 dark:divide-white/10 hover:no-underline!"
          >
            {checklistSections.map(
              (section) => {
                const isCustom = section.id.startsWith("custom-")
                return (
                  <div key={section.id} className="relative">

                    {/* Remove button only for custom sections */}
                    {isCustom && canManageChecklist && !isProjectCompleted && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="absolute top-1 left-3 cursor-pointer z-10 text-[10px] text-destructive hover:underline mr-10">
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
                            <Button
                              onClick={() => removeAndPersistCustomSection(section.id)}
                              variant="destructive"
                            >
                              Delete
                            </Button>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    <ChecklistSection
                      section={section}
                      isAgency={true}
                      canEdit={canManageChecklist}
                      canModerate={canManageChecklist}
                      isReadOnly={isProjectCompleted}
                      submissions={project.submissions}
                      onSubmissionsChange={(next) => void persistSubmissions(next)}
                      isSaving={savingSubmissions}
                      className={isCustom ? "custom-checklist-section" : undefined}
                    />
                  </div>
                )
              }
            )}
          </Accordion>

          {/* Add Custom Section */}
          {canManageChecklist && !isProjectCompleted && <div className="mt-4 space-y-4">
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
        <div className="right-block p-5 space-y-6">
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
            <h3 className="text-base font-medium">
              {teamAccessEnabled ? "Teams & Members" : "Project Members"}
            </h3>
            {canEditProject && (
              <Button
                size="sm"
                variant="gradient"
                onClick={() => {
                  if (!teamAccessEnabled && externalMemberLimitReached) {
                    toast.error("External member limit reached for this plan.")
                    return
                  }
                  setInviteType("member")
                  setOpenInvite(true)
                }}
              >
                <Plus className="h-4 w-4" />
                {teamAccessEnabled ? "Add Team/Members" : "Add Member"}
              </Button>
            )}
          </div>

          {visibleTeams.length === 0 && externalMembers.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title="No members added"
              description={
                teamAccessEnabled
                  ? "Create a team or invite external members to this project."
                  : "Invite external collaborators to this project."
              }
              // buttonText={canEditProject ? (isFreelancer ? "Add Member" : "Add Team/Members") : undefined}
              // onClick={() => {
              //   setInviteType(isFreelancer ? "member" : "member")
              //   setOpenInvite(true)
              // }}
            />
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <Table className="[&_th]:px-5 [&_th]:py-5 [&_td]:px-5 [&_td]:py-4 text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Member/Team Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Lead / Email</TableHead>
                    <TableHead>Members / Role</TableHead>
                    <TableHead>Status</TableHead>
                    {canSeeAccessToken && <TableHead>Access</TableHead>}
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleTeams.map((team) => {
                    if (!team) return null
                    const members = [
                      ...(team.lead ? [{ ...team.lead, isLead: true }] : []),
                      ...(team.members ?? []),
                    ]
                    return (
                      <TableRow key={`team-${team.id ?? team.slug ?? team.name}`}>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell>
                          <Badge className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded-full">
                            Team
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {team.lead ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={team.lead.image} />
                                <AvatarFallback className={`font-bold ${getAvatarColor(team.lead?.name || team.lead?.email || "M")}`}>
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
                        {canSeeAccessToken && <TableCell>-</TableCell>}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="secondary" onClick={() => setViewTeam(team)}>
                              View Members
                            </Button>
                            {isSuperAdmin ? (
                              <AlertDialog
                                open={openRemoveTeamId === team.id}
                                onOpenChange={(open) => {
                                  if (!open && removingTeamId === team.id) return
                                  setOpenRemoveTeamId(open ? team.id : null)
                                }}
                              >
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-red-500 hover:text-red-700 cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove {team.name}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will unassign the team from the project. The team will remain in your workspace.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel disabled={removingTeamId === team.id}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      variant="destructive"
                                      onClick={() => {
                                        setRemovingTeamId(team.id)
                                        void removeTeam(team.id)
                                      }}
                                      disabled={removingTeamId === team.id}
                                    >
                                      {removingTeamId === team.id ? (
                                        <span className="inline-flex items-center gap-2">
                                          <Spinner className="h-4 w-4" />
                                          Removing...
                                        </span>
                                      ) : (
                                        "Remove Team"
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}

                  {externalMembers.map((member) => (
                    <TableRow key={`member-${member.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.image} />
                            <AvatarFallback className={`font-bold ${getAvatarColor(member.name || member.email || "M")}`}>
                              {member.name.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{member.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="px-2 py-1 text-xs bg-violet-50 text-violet-700 rounded-full dark:bg-violet-500/15 dark:text-violet-200">
                          External
                        </Badge>
                      </TableCell>
                      <TableCell>{member.email || "-"}</TableCell>
                      <TableCell>{member.role || "-"}</TableCell>
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
                                const link = buildInviteUrl(member.accessToken)
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
                        {isSuperAdmin && member.isExternal && (
                          <AlertDialog
                            open={openRemoveMemberId === member.id}
                            onOpenChange={(open) => {
                              if (!open && removingMemberId === member.id) return
                              setOpenRemoveMemberId(open ? member.id : null)
                            }}
                          >
                            <AlertDialogTrigger asChild>
                              <button className="text-red-500 hover:text-red-700 cursor-pointer">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </AlertDialogTrigger>

                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Remove {member.name} - {member.role}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Remove this member from the project. They can be invited again anytime.
                                </AlertDialogDescription>
                              </AlertDialogHeader>

                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={removingMemberId === member.id}>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    setRemovingMemberId(member.id)
                                    void removeExternalMember(member.id)
                                  }}
                                  variant="destructive"
                                  disabled={removingMemberId === member.id}
                                >
                                  {removingMemberId === member.id ? (
                                    <span className="inline-flex items-center gap-2">
                                      <Spinner className="h-4 w-4" />
                                      Removing...
                                    </span>
                                  ) : (
                                    "Remove From Project"
                                  )}
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
          )}
        </div>
      </div>

      <Dialog open={openInvite} onOpenChange={setOpenInvite}>
        <DialogContent className="space-y-6">
          <DialogHeader>
            <DialogTitle>{teamAccessEnabled ? "Add Team or Member" : "Add Member"}</DialogTitle>
          </DialogHeader>

            {hasAvailableTeams ? (
              <Select
                value={inviteType}
                onValueChange={(value: "member" | "team") =>
                  setInviteType(value)
                }                
              >
                <SelectTrigger className="mb-2">
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
            ) : null}

            {hasAvailableTeams && inviteType === "team" && (
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

          {inviteType === "member" && (
            <div className="space-y-3">
              {!inviteSubmitting && externalMemberLimitReached ? (
                <p className="text-xs text-destructive">
                  External member limit reached for this plan.
                </p>
              ) : null}
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
                  : inviteSubmitting ||
                    externalMemberLimitReached ||
                    !newMemberName ||
                    !newMemberDesignation ||
                    !newMemberEmail
              }
            >
              {inviteSubmitting ? "Adding..." : <><Plus /> Add</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(viewTeam)}
        onOpenChange={(open) => {
          if (!open) {
            window.setTimeout(() => setViewTeam(null), 300)
          }
        }}
      >
        <DialogContent className="space-y-4 sm:max-w-5xl">
          <DialogHeader className="mb-0">
            <DialogTitle>{viewTeam?.name || "Team Members"}</DialogTitle>
          </DialogHeader>
          {viewTeam ? (
            <div className="overflow-hidden -mx-5">
              <Table className="[&_th]:px-5 [&_th]:py-4 [&_td]:px-5 [&_td]:py-4 text-sm">
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
                  ]
                    .filter(Boolean)
                    .map((member) => (
                    <TableRow key={`${member.id}-${member.email ?? "member"}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={member.image} />
                            <AvatarFallback className={`font-bold ${getAvatarColor(member.name || member.email || "M")}`}>
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
                                const link = buildInviteUrl(member.accessToken)
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
    </>
  )
}
