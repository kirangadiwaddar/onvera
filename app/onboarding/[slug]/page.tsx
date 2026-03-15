"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import type { Project } from "@/types/project"
import type { Section } from "@/lib/types"
import ChecklistSection from "@/components/checklist-section"
import { Accordion } from "@/components/ui/accordion"
import Logo from "@/components/ui/logo"
import { Progress } from "@/components/ui/progress"

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar"
import { getAvatarColor } from "@/lib/get-avatar-colors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { BadgeCheck, Check, Download, Files, Monitor, Moon, Sun } from "lucide-react"
import { EmptyState } from "@/components/emptyState"
import { Separator } from "@/components/ui/separator"
import { LoadingState } from "@/components/loadingState"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

const CUSTOM_SECTIONS_KEY = "__custom_sections"

function getCustomSectionsFromSubmissions(submissions?: Record<string, unknown>): Section[] {
  const raw = submissions?.[CUSTOM_SECTIONS_KEY]
  if (!Array.isArray(raw)) return []
  return raw
    .map((section) => {
      if (!section || typeof section !== "object") return null
      const candidate = section as { id?: unknown; title?: unknown; dynamic?: unknown; items?: unknown[] }
      if (typeof candidate.id !== "string" || typeof candidate.title !== "string") return null
      const items = (Array.isArray(candidate.items) ? candidate.items : [])
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
  const entries: { label: string; preview?: string; url?: string }[] = []
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
    const field = value as { value?: unknown }
    if (typeof field.value === "string" && field.value.trim()) {
      entries.push({
        label: labelByItemId.get(key) ?? key,
        url: field.value,
        preview: typeof (value as { preview?: unknown }).preview === "string" ? (value as { preview: string }).preview : undefined,
      })
    }
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

export default function ClientOnboardingPage() {
  const { slug } = useParams()
  const searchParams = useSearchParams()
  const requireToken = process.env.NEXT_PUBLIC_REQUIRE_ONBOARDING_TOKEN !== "false"
  const token = searchParams.get("t") || searchParams.get("token")
  const missingRequiredToken = requireToken && !token
  const shouldValidateToken = Boolean(token)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [tokenValidating, setTokenValidating] = useState(shouldValidateToken)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [requiresPassword, setRequiresPassword] = useState(false)
  const [accessGranted, setAccessGranted] = useState(!shouldValidateToken)
  const [passwordInput, setPasswordInput] = useState("")
  const [unlocking, setUnlocking] = useState(false)
  const [submissionsDraft, setSubmissionsDraft] = useState<Record<string, unknown>>({})
  const [savingSubmissions, setSavingSubmissions] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (!slug) return

    if (!token) {
      setTokenValidating(false)
      if (requireToken) {
        setTokenError("Missing onboarding token")
        return
      }
      setAccessGranted(true)
      return
    }

    const validateAccess = async () => {
      setTokenValidating(true)
      setTokenError(null)

      try {
        const validateResponse = await fetch(`/api/onboarding/validate?slug=${slug}&token=${token}`, {
          cache: "no-store",
        })
        const validateData = await validateResponse.json()

        if (!validateData.valid) {
          setTokenError(validateData.message ?? "Invalid onboarding link")
          return
        }

        const needsPassword = Boolean(validateData.requiresPassword)
        setRequiresPassword(needsPassword)

        if (needsPassword) {
          setAccessGranted(false)
          return
        }

        const consumeResponse = await fetch("/api/onboarding/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            slug,
          }),
        })
        const consumeData = await consumeResponse.json()
        if (!consumeData.valid) {
          setTokenError(consumeData.message ?? "Invalid onboarding link")
          return
        }

        setAccessGranted(true)
      } catch {
        setTokenError("Unable to validate onboarding link")
      } finally {
        setTokenValidating(false)
      }
    }

    void validateAccess()
  }, [requireToken, slug, token])

  useEffect(() => {
    setMounted(true)
    if (typeof window === "undefined") return
    const saved = window.localStorage.getItem("onvera-theme")
    if (saved === "light" || saved === "dark" || saved === "system") {
      setTheme(saved)
    }
  }, [])

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return
    const root = document.documentElement
    const media = window.matchMedia("(prefers-color-scheme: dark)")

    const apply = (isDark: boolean) => {
      root.classList.toggle("dark", isDark)
    }

    let cleanup: (() => void) | undefined

    if (theme === "dark") {
      apply(true)
    } else if (theme === "light") {
      apply(false)
    } else {
      apply(media.matches)
      const handleChange = (event: MediaQueryListEvent) => apply(event.matches)
      media.addEventListener("change", handleChange)
      cleanup = () => media.removeEventListener("change", handleChange)
    }

    window.localStorage.setItem("onvera-theme", theme)

    return () => cleanup?.()
  }, [theme, mounted])

  const handleUnlock = async () => {
    if (!slug || !token) return
    setUnlocking(true)
    setTokenError(null)
    try {
      const response = await fetch("/api/onboarding/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          slug,
          password: passwordInput,
        }),
      })

      const data = await response.json()
      if (!data.valid) {
        setTokenError(data.message ?? "Invalid onboarding link")
        return
      }

      setAccessGranted(true)
    } catch {
      setTokenError("Unable to validate onboarding link")
    } finally {
      setUnlocking(false)
    }
  }

  const loadProject = useCallback(async (silent = false) => {
    if (!slug || tokenValidating || tokenError || missingRequiredToken || !accessGranted) return
    if (!silent) setLoading(true)

    const params = new URLSearchParams({ slug })
    if (token) params.set("token", token)

    const res = await fetch(`/api/onboarding/project?${params.toString()}`, { cache: "no-store" })
    const data = await res.json().catch(() => null) as { project?: Project } | null
    if (data?.project) {
      setProject(data.project)
      setSubmissionsDraft(data.project.submissions || {})
    }
    if (!silent) setLoading(false)
  }, [accessGranted, missingRequiredToken, slug, token, tokenError, tokenValidating])

  useEffect(() => {
    void loadProject()
  }, [loadProject])

  const supabase = useMemo(() => {
    try {
      return createClient()
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    if (!slug || !supabase || tokenValidating || tokenError || missingRequiredToken || !accessGranted) return
    const channel = supabase
      .channel(`onboarding-project-${slug}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects", filter: `slug=eq.${slug}` },
        () => void loadProject(true),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [accessGranted, loadProject, missingRequiredToken, slug, supabase, tokenError, tokenValidating])

  const saveProgress = async () => {
    if (!project) return

    setSavingSubmissions(true)
    try {
      const response = await fetch("/api/onboarding/project", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: project.slug,
          token,
          submissions: submissionsDraft,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.message || "Failed to save progress")
      }

      if (data?.project) {
        setProject(data.project)
        setSubmissionsDraft(data.project.submissions || {})
      }
    } catch (error) {
      console.error("Unable to save onboarding progress:", error)
    } finally {
      setSavingSubmissions(false)
    }
  }

  if (missingRequiredToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        Missing onboarding token
      </div>
    )
  }

  if (tokenValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Validating onboarding link...
      </div>
    )
  }

  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        {tokenError}
      </div>
    )
  }

  if (requiresPassword && !accessGranted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-lg border bg-white p-5 space-y-4 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-center gap-2 text-xl font-semibold">
            <Logo width={26} /> Onvera
          </div>
          <h2 className="text-lg font-medium text-center">Enter Access Password</h2>
          <PasswordInput
            placeholder="Password"
            value={passwordInput}
            onChange={(event) => setPasswordInput(event.target.value)}
          />
          <Button
            variant="gradient"
            className="w-full"
            onClick={() => void handleUnlock()}
            disabled={unlocking || !passwordInput}
          >
            {unlocking ? "Checking..." : "Continue"}
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <LoadingState title="Loading Project" description="Preparing onboarding data..." />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <EmptyState title="Project Not Found" description="We couldn't find this project." />
      </div>
    )
  }

  const sections = [
    ...(project.templateStructure || []),
    ...getCustomSectionsFromSubmissions(submissionsDraft),
  ]

  const totalSections = sections.length
  const completedSections = sections.filter(
    (section) => submissionsDraft?.[`__section_complete:${section.id}`] === true,
  ).length
  const projectProgress = totalSections === 0
    ? 0
    : Math.min(Math.round((completedSections / totalSections) * 100), 100)
  const uploadedCount = sections.filter((section) => {
    if (section.dynamic) {
      const rows = submissionsDraft?.[section.id]
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

    return section.items.every((item) => {
      const entry = submissionsDraft?.[item.id]
      if (!entry || typeof entry !== "object") return false
      const value = (entry as { value?: unknown }).value
      if (typeof value === "string") return value.trim().length > 0
      return Boolean(value)
    })
  }).length
  const progress = totalSections === 0
    ? 0
    : Math.min(Math.round((uploadedCount / totalSections) * 100), 100)
  const progressRadius = 22
  const progressStroke = 4
  const progressCircumference = 2 * Math.PI * progressRadius
  const progressOffset = progressCircumference * (1 - progress / 100)

  const members = project.members || []

  const visibleMembers = members.slice(0, 3)
  const remainingCount =
    members.length > 3 ? members.length - 3 : 0

    const getProgressStrokeColor = (value: number) => {
  if (value < 40) return "text-red-500"
  if (value < 80) return "text-amber-500"
  return "text-emerald-500"
}

    const getProgressBarColor = (value: number) => {
  if (value < 40) return "!bg-gradient-to-r from-red-400 to-red-500"
  if (value < 80) return "!bg-gradient-to-r from-amber-400 to-orange-500"
  return "!bg-gradient-to-r from-emerald-400 to-green-500"
}

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0b0b13] dark:text-white">

      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-white/10 dark:bg-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          {/* Logo */}
          <div className="text-xl flex items-center gap-2 font-semibold">
            <Logo width={30} /> Onvera
          </div>

          {/* Team Info */}
          {/* <div className="text-sm text-muted-foreground">
            Team Members: {project.members?.length || 1}
          </div> */}
          <div className="flex items-center gap-3">
            {members.length > 0 ? (
              <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-violet-100 p-2 pl-3 dark:border-white/10 dark:bg-violet-500/15">
                <p className="text-sm font-medium text-violet-900 dark:text-violet-200">Team Members </p>
                <AvatarGroup>
                  {visibleMembers.map((member) => (
                    <Avatar key={member.id} size="sm">
                      <AvatarImage
                        src={member.image}
                        alt={member.name}
                      />
                      <AvatarFallback
                        className={`font-bold ${getAvatarColor(String(member.id))}`}
                      >
                        {member.name.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}

                  {remainingCount > 0 && (
                    <AvatarGroupCount className="bg-violet-700 text-white text-xs dark:bg-white/10">
                      +{remainingCount}
                    </AvatarGroupCount>
                  )}
                </AvatarGroup>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-violet-100 p-2 pl-3 text-sm font-medium text-violet-900 dark:border-white/10 dark:bg-violet-500/15 dark:text-violet-200">
                No team members added yet.
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white/80 text-zinc-500 transition hover:text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:text-white",
                  )}
                  aria-label="Theme switcher"
                >
                  {theme === "light" ? (
                    <Sun className="h-4 w-4" />
                  ) : theme === "dark" ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Monitor className="h-4 w-4" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-36">
                <DropdownMenuItem onSelect={() => setTheme("light")}>
                  <Sun /> Light
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setTheme("dark")}>
                  <Moon /> Dark
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setTheme("system")}>
                  <Monitor /> System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto px-6 sm:grid sm:grid-cols-3 gap-10 min-h-[calc(100dvh-85px)]">

        {/* LEFT 60% */}
        <div className="left-block col-span-2 space-y-8 border-r border-zinc-200 py-10 pr-10 h-full dark:border-white/10">

          {/* Project Title */}
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold">
              {project.title}
            </h1>
            <p className="text-muted-foreground">
              Please complete the details below.
            </p>
          </div>

          {/* Checklist Summary */}
          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Project Onboarding Checklist</p>
              <p className="text-xs text-muted-foreground mt-1">{uploadedCount}/{totalSections} sections uploaded</p>
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
                  className="text-zinc-200"
                />
                <circle
                  cx="26"
                  cy="26"
                  r={progressRadius}
                  stroke="currentColor"
                  strokeWidth={progressStroke}
                  strokeLinecap="round"
                  fill="none"
                  className={getProgressStrokeColor(progress)}
                  strokeDasharray={progressCircumference}
                  strokeDashoffset={progressOffset}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-zinc-700">
                {progress === 100 ? (
                  <Check strokeWidth={3} className="size-6 text-emerald-500" />
                ) : (
                  `${progress}%`
                )}
              </div>
            </div>
          </div>

          {/* Sections */}
          <Accordion type="multiple" className="border border-zinc-200 rounded-lg overflow-hidden dark:border-white/10">
            {sections.map((section) => (
              <ChecklistSection
                key={section.id}
                section={section}
                isAgency={false}
                submissions={submissionsDraft || {}}
                onSubmissionsChange={setSubmissionsDraft}
                showCompletionControl={false}
              />
            ))}
          </Accordion>

          <Button
            variant="gradient"
            size="lg"
            className="w-full text-lg py-6"
            onClick={() => void saveProgress()}
            disabled={savingSubmissions}
          >
            {savingSubmissions ? "Saving..." : "Save Progress"}
          </Button>

        </div>

        {/* RIGHT 40% */}
          <div className="right-block space-y-8 py-10">
           
          {/* Uploaded Files */}
          {getUploadedEntries(submissionsDraft, [
            ...(project.templateStructure || []),
            ...getCustomSectionsFromSubmissions(submissionsDraft),
          ]).length === 0 ? (
            <EmptyState icon={<Files />} title="No Files Uploaded" description="Client onboarding is pending" />
          ) :
            <div className="space-y-4">
              <h2 className="text-primary font-medium text-sm mb-6">
                Uploaded Files
              </h2>


              <div className="flex items-center gap-3 flex-wrap">
                {getUploadedEntries(submissionsDraft, [
                  ...(project.templateStructure || []),
                  ...getCustomSectionsFromSubmissions(submissionsDraft),
                ]).map((entry) => {
                  const href = entry.preview || entry.url
                  const clickable = canOpenLink(href)
                  const downloadName = href
                    ? (hasFileExtension(extractFileName(href))
                      ? extractFileName(href)
                      : `${safeFileName(entry.label)}.${href.startsWith("data:") ? getDataUrlExtension(href) : "bin"}`)
                    : undefined

                  if (!clickable) {
                    return (
                      <div
                        key={`${entry.label}-${entry.url ?? "missing"}`}
                        className="py-2 px-3 text-xs capitalize font-normal bg-violet-50 border border-violet-200 rounded-full flex items-center gap-2 dark:bg-violet-500/10 dark:border-violet-500/20 dark:text-violet-100"
                      >
                        {entry.label}
                        <BadgeCheck className="size-5" fill="#00c951" stroke="#fff" />
                      </div>
                    )
                  }

                  return (
                    <a
                      key={`${entry.label}-${entry.url ?? "missing"}`}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      download={downloadName}
                      className="py-2 px-3 text-xs capitalize font-normal bg-violet-50 border border-violet-200 rounded-full flex items-center gap-2 hover:bg-violet-100 dark:bg-violet-500/10 dark:border-violet-500/20 dark:text-violet-100 dark:hover:bg-violet-500/20"
                    >
                      {entry.label}
                      <BadgeCheck className="size-5" fill="#00c951" stroke="#fff" />
                      <Download className="size-3.5 text-violet-600 dark:text-violet-200" />
                    </a>
                  )
                })}
              </div>
            </div>
          }

           <Separator />
          <div className="project-progress-block">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Project Progress</span>
              <span className="text-muted-foreground">{projectProgress}%</span>
            </div>
            <Progress
              value={projectProgress}
              className="mt-2"
              indicatorClassName={getProgressBarColor(projectProgress)}
            />
          </div>

          <Separator />

          {/* Timeline */}
          <div className="space-y-4">
            <h2 className="text-primary font-medium text-sm mb-6">
              Activity Timeline
            </h2>

            <div className="border border-zinc-200 rounded-lg space-y-3 text-sm dark:border-white/10">
              <div className="flex justify-between items-center text-sm border-b p-2.5 last:border-b-0">
                <p className="font-medium text-xs">Project Created</p>
                <p className="text-muted-foreground">
                  {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
              {project.updatedAt && (
              <div className="flex justify-between items-center text-sm border-b p-2.5 pt-0 last:border-b-0">
                <p className="font-medium text-xs">Last Updated</p>
                <p className="text-muted-foreground">
                  {new Date(project.updatedAt).toLocaleDateString()}
                </p>
              </div>)}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
