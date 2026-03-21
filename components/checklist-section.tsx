"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AccordionItem,
  AccordionContent,
} from "@/components/ui/accordion"
import { Accordion as AccordionPrimitive } from "radix-ui"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Section } from "@/lib/types"
import { CheckCircle2, ChevronDownIcon, XCircle } from "lucide-react"
import { BrandingUploader } from "@/components/branding-uploader"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type SubmissionValue = {
  value?: string
  status?: "submitted" | "approved" | "rejected" | string
  preview?: string
  submittedAt?: string
}

type DynamicRow = {
  name?: string
  url?: string
  status?: "submitted" | "approved" | "rejected" | string
  submittedAt?: string
}

type Submissions = Record<string, SubmissionValue | DynamicRow[] | unknown>

type Props = {
  section: Section
  isAgency: boolean
  canEdit?: boolean
  canModerate?: boolean
  submissions?: Submissions
  onSubmissionsChange?: (next: Submissions) => void
  showCompletionControl?: boolean
  className?: string
  isSaving?: boolean
}

function getStatusBadgeClass(status?: string) {
  if (status === "approved") return "bg-green-50 text-green-700"
  if (status === "rejected") return "bg-red-50 text-red-700"
  return "bg-sky-50 text-sky-700"
}

function isUrlLike(value?: string) {
  if (!value) return false
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")
}

export default function ChecklistSection({
  section,
  isAgency,
  canEdit = isAgency,
  canModerate = isAgency,
  submissions = {},
  onSubmissionsChange,
  showCompletionControl = true,
  className,
  isSaving = false,
}: Props) {
  const [editMode, setEditMode] = useState<Record<string, boolean>>({})
  const [brandingEdit, setBrandingEdit] = useState(false)
  const [selectedBrandingRows, setSelectedBrandingRows] = useState<Set<number>>(new Set())
  const [draftValues, setDraftValues] = useState<Record<string, string>>({})
  const [draftPreviews, setDraftPreviews] = useState<Record<string, string>>({})
  const [localRows, setLocalRows] = useState<{ name: string; url: string }[]>([])
  const [dynamicDrafts, setDynamicDrafts] = useState<Record<string, { name: string; url: string }>>({})
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)
  const dynamicRows = useMemo<DynamicRow[]>(() => {
    const rows = submissions[section.id]
    return Array.isArray(rows) ? (rows as DynamicRow[]) : []
  }, [section.id, submissions])

  const completionKey = `__section_complete:${section.id}`
  const completionValue = submissions[completionKey]
  const isCompleted = completionValue === true
  const isUpdated = completionValue === "updated"
  const hasStaticContent = section.items.some((item) => {
    const submission = submissions[item.id] as SubmissionValue | undefined
    const value = submission?.value
    return typeof value === "string" ? value.trim().length > 0 : Boolean(value)
  })
  const hasDynamicContent = dynamicRows.length > 0
  const hasContent = hasStaticContent || hasDynamicContent
  const allStaticApproved = section.items.every((item) => {
    const submission = submissions[item.id] as SubmissionValue | undefined
    return submission?.status === "approved"
  })
  const allDynamicApproved = !section.dynamic
    ? true
    : dynamicRows.length > 0 && dynamicRows.every((row) => row.status === "approved")
  const allBrandingApproved =
    section.id === "branding" && dynamicRows.length > 0 && dynamicRows.every((row) => row.status === "approved")
  const allBrandingRejected =
    section.id === "branding" && dynamicRows.length > 0 && dynamicRows.every((row) => row.status === "rejected")
  const hasRejected =
    section.items.some((item) => {
      const submission = submissions[item.id] as SubmissionValue | undefined
      return submission?.status === "rejected"
    }) || dynamicRows.some((row) => row.status === "rejected")
  const canShowCompletionControl =
    showCompletionControl &&
    (canEdit || canModerate || (allStaticApproved && allDynamicApproved)) &&
    hasContent

  useEffect(() => {
    if (section.id !== "branding") return
    if (hasContent) return
    if (completionValue !== true) return
    patchSubmissions((prev) => ({
      ...prev,
      [completionKey]: false,
    }))
  }, [completionKey, completionValue, hasContent, section.id])

  useEffect(() => {
    if (!isSaving) {
      setPendingActionId(null)
    }
  }, [isSaving])

  useEffect(() => {
    if (section.id !== "branding") return
    setSelectedBrandingRows((prev) => {
      const next = new Set<number>()
      dynamicRows.forEach((_, idx) => {
        if (prev.has(idx)) next.add(idx)
      })
      return next
    })
  }, [dynamicRows, section.id])

  const patchSubmissions = (mutate: (prev: Submissions) => Submissions) => {
    const next = mutate(submissions)
    onSubmissionsChange?.(next)
  }

  const runAction = (actionId: string, action: () => void) => {
    setPendingActionId(actionId)
    action()
  }

  const isActionPending = (actionId: string) => isSaving && pendingActionId === actionId

  const handleBrandingFileAdded = (file: File) => {
    const canWrite = !isAgency || ((canEdit || canModerate) && brandingEdit)
    if (!canWrite) return
    const reader = new FileReader()
    reader.onload = () => {
      const preview = typeof reader.result === "string" ? reader.result : ""
      patchSubmissions((prev) => {
        const existing = Array.isArray(prev[section.id]) ? (prev[section.id] as DynamicRow[]) : []
        const next: DynamicRow[] = [
          ...existing,
          {
            name: file.name,
            url: preview,
            status: "submitted",
            submittedAt: new Date().toISOString(),
          },
        ]
        return {
          ...prev,
          [section.id]: next,
        }
      })
    }
    reader.readAsDataURL(file)
  }

  const setBrandingStatus = (rowIndex: number, status: "approved" | "rejected") => {
    patchSubmissions((prev) => {
      const existing = Array.isArray(prev[section.id]) ? (prev[section.id] as DynamicRow[]) : []
      const next = existing.map((row, index) =>
        index === rowIndex ? { ...row, status } : row,
      )
      return { ...prev, [section.id]: next }
    })
  }

  const removeBrandingRow = (rowIndex: number) => {
    patchSubmissions((prev) => {
      const existing = Array.isArray(prev[section.id]) ? (prev[section.id] as DynamicRow[]) : []
      const next = existing.filter((_, index) => index !== rowIndex)
      return {
        ...prev,
        [section.id]: next,
        [completionKey]: next.length === 0 ? false : prev[completionKey],
      }
    })
  }

  const toggleBrandingRowSelection = (rowIndex: number) => {
    setSelectedBrandingRows((prev) => {
      const next = new Set(prev)
      if (next.has(rowIndex)) {
        next.delete(rowIndex)
      } else {
        next.add(rowIndex)
      }
      return next
    })
  }

  const applyBrandingStatusToSelection = (status: "approved" | "rejected") => {
    if (selectedBrandingRows.size === 0) {
      dynamicRows.forEach((_, idx) => setBrandingStatus(idx, status))
      return
    }
    selectedBrandingRows.forEach((idx) => setBrandingStatus(idx, status))
  }


  const toggleSectionComplete = () => {
    patchSubmissions((prev) => ({
      ...prev,
      [completionKey]: prev[completionKey] === true ? false : true,
    }))
  }

  const hasSectionContent = (data: Submissions) => {
    const staticHasValue = section.items.some((item) => {
      const submission = data[item.id] as SubmissionValue | undefined
      const value = submission?.value
      return typeof value === "string" ? value.trim().length > 0 : Boolean(value)
    })
    if (staticHasValue) return true
    const dynamic = data[section.id]
    return Array.isArray(dynamic) && dynamic.length > 0
  }

  const markSectionUpdated = (prev: Submissions, next: Submissions) => {
    if (prev[completionKey] === true && hasSectionContent(prev)) {
      return {
        ...next,
        [completionKey]: "updated",
      }
    }
    return next
  }

  const toggleEdit = (id: string) => {
    setEditMode((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const submitItem = (
    itemId: string,
    value: string,
    defaultStatus: "submitted" | "approved" = "submitted",
    extras?: Partial<SubmissionValue>,
  ) => {
    patchSubmissions((prev) => {
      const next: Submissions = {
        ...prev,
        [itemId]: {
          value,
          status: defaultStatus,
          submittedAt: new Date().toISOString(),
          ...extras,
        },
      }
      return markSectionUpdated(prev, next)
    })
  }

  const setItemStatus = (itemId: string, status: "approved" | "rejected" | "submitted") => {
    const current = (submissions[itemId] as SubmissionValue | undefined) || {}
    patchSubmissions((prev) => {
      const next: Submissions = {
        ...prev,
        [itemId]: {
          ...current,
          status,
          submittedAt: current.submittedAt || new Date().toISOString(),
        },
      }
      return markSectionUpdated(prev, next)
    })
  }

  const saveAgencyEdit = (itemId: string) => {
    const current = (submissions[itemId] as SubmissionValue | undefined) || {}
    const nextValue = draftValues[itemId] ?? current.value ?? ""
    const preview = draftPreviews[itemId] ?? current.preview
    submitItem(itemId, nextValue, current.status === "approved" ? "approved" : "submitted", { preview })
    setEditMode((prev) => ({ ...prev, [itemId]: false }))
  }

  const updateDynamicRow = (index: number, patch: Partial<DynamicRow>) => {
    patchSubmissions((prev) => {
      const rows = Array.isArray(prev[section.id]) ? [...(prev[section.id] as DynamicRow[])] : []
      rows[index] = {
        ...(rows[index] || {}),
        ...patch,
      }
      const next: Submissions = {
        ...prev,
        [section.id]: rows,
      }
      return markSectionUpdated(prev, next)
    })
  }

  const saveDynamicRow = (index: number) => {
    const dynamicId = `${section.id}-${index}`
    const draft = dynamicDrafts[dynamicId]
    if (!draft) return

    updateDynamicRow(index, {
      name: draft.name,
      url: draft.url,
      status: "submitted",
      submittedAt: new Date().toISOString(),
    })
    setEditMode((prev) => ({ ...prev, [dynamicId]: false }))
  }

  const addDynamicRow = () => {
    setLocalRows((prev) => [...prev, { name: "", url: "" }])
  }

  const removeLocalRow = (index: number) => {
    setLocalRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index))
  }

  const removeDynamicRow = (index: number) => {
    patchSubmissions((prev) => {
      const rows = Array.isArray(prev[section.id]) ? [...(prev[section.id] as DynamicRow[])] : []
      rows.splice(index, 1)
      const next: Submissions = {
        ...prev,
        [section.id]: rows,
      }
      return markSectionUpdated(prev, next)
    })
  }

  const submitDynamicRow = (row: { name: string; url: string }, rowIndex: number) => {
    if (!row.name.trim() || !row.url.trim()) return

    patchSubmissions((prev) => {
      const rows = Array.isArray(prev[section.id]) ? [...(prev[section.id] as DynamicRow[])] : []
      rows.push({
        name: row.name.trim(),
        url: row.url.trim(),
        status: "submitted",
        submittedAt: new Date().toISOString(),
      })
      const next: Submissions = {
        ...prev,
        [section.id]: rows,
      }
      return markSectionUpdated(prev, next)
    })

    setLocalRows((prev) => prev.filter((_, index) => index !== rowIndex))
  }

  return (
    <AccordionItem
      value={section.id}
      className={`rounded-none group${className ? ` ${className}` : ""}`}
    >
      <AccordionPrimitive.Header className="relative flex items-center gap-3 px-3 py-2.5 mb-0 hover:bg-zinc-50 has-[[data-state=open]]:bg-violet-50 dark:hover:bg-white/5 dark:has-[[data-state=open]]:bg-violet-500/10">
        <AccordionPrimitive.Trigger
          data-slot="accordion-trigger"
          className="group/trigger focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-center justify-between gap-4 rounded-md text-left text-sm font-medium transition-all outline-none hover:no-underline focus-visible:ring-[3px] cursor-pointer disabled:pointer-events-none disabled:opacity-50 data-[state=open]:text-violet-700 dark:data-[state=open]:text-violet-200"
        >
          <span>{section.title}</span>
          <div className="flex items-center justify-end flex-row-reverse gap-2">
              <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/trigger:rotate-180" />
          <div className="flex items-center gap-2">
          {hasRejected ? (
            <Badge className="px-2 py-0.5 text-[11px] bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-500/20">
              Rejected
            </Badge>
          ) : isCompleted && hasContent ? (
            <Badge className="px-2 py-0.5 text-[11px] bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/20">
              Completed
            </Badge>
          ) : isUpdated && hasContent ? (
            <Badge className="px-2 py-0.5 text-[11px] bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/20">
              Updated
            </Badge>
          ) : null}
          {canShowCompletionControl && (allStaticApproved && allDynamicApproved) ? (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild variant="ghost" size="icon">
                    <span
                      role="button"
                      tabIndex={0}
                      className={`h-7 w-7 ${isCompleted ? "text-destructive hover:text-destructive/80" : "text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-300"}`}
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        runAction(`complete-${section.id}`, () => toggleSectionComplete())
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          event.stopPropagation()
                          runAction(`complete-${section.id}`, () => toggleSectionComplete())
                        }
                      }}
                      aria-label={isCompleted ? "Mark as incomplete" : "Mark as complete"}
                    >
                      {isActionPending(`complete-${section.id}`) ? (
                        <Spinner className="size-3" />
                      ) : isCompleted ? (
                        <XCircle className="size-4" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isCompleted ? "Mark as incomplete" : "Mark as complete"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
          </div>          
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>

      <AccordionContent className="border-b border-zinc-100 pb-0 last:border-b-0">
        {section.id === "branding" ? (
          <div className="p-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Upload your brand logo, guidelines, fonts, and related branding assets.
            </p>
            <BrandingUploader
              disabled={isAgency ? !((canEdit || canModerate) && brandingEdit) : false}
              onFileAdded={handleBrandingFileAdded}
            />
            {dynamicRows.length > 0 ? (
              <div className="space-y-2">
                {dynamicRows.map((row, index) => (
                  <div
                    key={`${section.id}-branding-${index}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 px-3 py-2 text-xs dark:border-white/10"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isAgency && canModerate && dynamicRows.length > 1 ? (
                        <input
                          type="checkbox"
                          checked={selectedBrandingRows.has(index)}
                          onChange={() => toggleBrandingRowSelection(index)}
                          aria-label="Select file"
                          className="h-4 w-4 rounded border-zinc-300 text-violet-600 focus:ring-0"
                        />
                      ) : null}
                      {row.url && isUrlLike(row.url) && row.url.match(/^data:image\/|\\.(png|jpg|jpeg|gif|webp|svg)$/i) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.url} alt={row.name || "Brand file"} className="h-8 w-8 rounded-md object-cover border border-zinc-200 dark:border-white/10" />
                      ) : null}
                      <span className="truncate">{row.name || "Brand file"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`py-1 px-2 text-[11px] capitalize ${getStatusBadgeClass(row.status)}`}>
                        {row.status || "submitted"}
                      </Badge>
                      {(!isAgency || ((canEdit || canModerate) && brandingEdit)) ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => runAction(`branding-remove-${index}`, () => removeBrandingRow(index))}
                          aria-label="Remove file"
                          disabled={isSaving}
                        >
                          {isActionPending(`branding-remove-${index}`) ? (
                            <Spinner className="size-3" />
                          ) : (
                            <XCircle className="size-4 text-muted-foreground" />
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No branding files uploaded yet.</div>
            )}
            {isAgency && (canEdit || canModerate) ? (
              <div className="flex justify-end items-center gap-1.5">
                {canEdit || canModerate ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 px-2"
                    onClick={() => setBrandingEdit((prev) => !prev)}
                  >
                    {brandingEdit ? "Cancel Edit" : "Enable Edit"}
                  </Button>
                ) : null}
                {canModerate ? (
                  <>
                    <Button
                      size="sm"
                      variant="destructiveLight"
                      className="text-xs h-7 px-2"
                      onClick={() => runAction("branding-reject", () => applyBrandingStatusToSelection("rejected"))}
                      aria-label="Reject"
                      disabled={dynamicRows.length === 0 || allBrandingRejected || isSaving}
                    >
                      {isActionPending("branding-reject") ? (
                        <span className="inline-flex items-center gap-2">
                          <Spinner className="size-3" />
                          Reject
                        </span>
                      ) : (
                        "Reject"
                      )}
                    </Button>
                    <Button
                      variant="gradient"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => runAction("branding-approve", () => applyBrandingStatusToSelection("approved"))}
                      aria-label="Approve"
                      disabled={dynamicRows.length === 0 || allBrandingApproved || isSaving}
                    >
                      {isActionPending("branding-approve") ? (
                        <span className="inline-flex items-center gap-2">
                          <Spinner className="size-3" />
                          Approve
                        </span>
                      ) : (
                        "Approve"
                      )}
                    </Button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
        <>
        {section.items.map((item) => {
          const submission = (submissions[item.id] as SubmissionValue | undefined) || {}
          const isEditing = editMode[item.id] || false
          const value = draftValues[item.id] ?? submission.value ?? ""
          const preview = draftPreviews[item.id] ?? submission.preview

          return (
            <div key={item.id} className="border-b border-zinc-200 p-3 space-y-2 last-of-type:border-b-0 dark:border-white/10">
              <div className="flex justify-between items-center">
                <div className="text-xs font-medium">{item.label}</div>

                <Badge className={`py-1 px-2 text-xs capitalize ${submission?.value ? getStatusBadgeClass(submission.status) : "bg-zinc-100 text-zinc-500"}`}>
                  {submission?.value ? submission.status || "submitted" : "Not Submitted"}
                </Badge>
              </div>

              {item.fieldType === "textarea" && (
                <Textarea
                  value={value}
                  disabled={isAgency ? !isEditing || !canEdit : false}
                  onChange={(event) =>
                    setDraftValues((prev) => ({
                      ...prev,
                      [item.id]: event.target.value,
                    }))
                  }
                />
              )}

              {(item.fieldType === "text" || item.fieldType === "url") && (
                <Input
                  value={value}
                  disabled={isAgency ? !isEditing || !canEdit : false}
                  onChange={(event) =>
                    setDraftValues((prev) => ({
                      ...prev,
                      [item.id]: event.target.value,
                    }))
                  }
                />
              )}

              {item.fieldType === "upload" && (
                <div className="space-y-1.5">
                  <Input
                    type="file"
                    disabled={isAgency ? !isEditing || !canEdit : false}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return

                      const reader = new FileReader()
                      reader.onload = () => {
                        const base64 = typeof reader.result === "string" ? reader.result : ""
                        setDraftValues((prev) => ({
                          ...prev,
                          [item.id]: file.name,
                        }))
                        setDraftPreviews((prev) => ({
                          ...prev,
                          [item.id]: base64,
                        }))

                        if (!isAgency) {
                          submitItem(item.id, file.name, "submitted", { preview: base64 })
                        }
                      }
                      reader.readAsDataURL(file)
                    }}
                  />

                  {preview && (
                    <div className="text-xs text-muted-foreground space-y-2">
                      <p>Preview</p>
                      {preview.startsWith("data:image") || preview.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview} alt={item.label} className="max-h-24 rounded border" />
                      ) : (
                        <a href={preview} target="_blank" rel="noreferrer" className="underline text-blue-600">
                          Open file
                        </a>
                      )}
                    </div>
                  )}
                  {!preview && submission.value && isUrlLike(submission.value) && (
                    <a href={submission.value} target="_blank" rel="noreferrer" className="text-xs underline text-blue-600 inline-block">
                      Open file
                    </a>
                  )}
                </div>
              )}

              {item.fieldType !== "upload" && !isAgency && (
                <Button
                  size="sm"
                  variant="default"
                  disabled={!value || isSaving}
                  onClick={() => runAction(`submit-${item.id}`, () => submitItem(item.id, value, "submitted"))}
                >
                  {isActionPending(`submit-${item.id}`) ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner className="size-3" />
                      Submit Data
                    </span>
                  ) : (
                    "Submit Data"
                  )}
                </Button>
              )}

              {item.fieldType === "url" &&
                (submission.value || value) &&
                isUrlLike(String(submission.value || value)) && (
                <a href={String(submission.value || value)} target="_blank" rel="noreferrer" className="text-xs underline text-blue-600 inline-block">
                  Preview Link
                </a>
              )}

              {isAgency && (canEdit || canModerate) && (
                <div className="flex justify-end items-center gap-1.5">
                  <TooltipProvider delayDuration={200}>
                    {canEdit && (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-2"
                              onClick={() => toggleEdit(item.id)}
                              aria-label={isEditing ? "Cancel edit" : "Enable edit"}
                            >
                              {isEditing ? "Cancel Edit" : "Enable Edit"}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isEditing ? "Cancel edit" : "Enable edit"}
                          </TooltipContent>
                        </Tooltip>
                        {isEditing && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                              size="sm"
                              className="text-xs h-7 px-2"
                              variant="default"
                              onClick={() => runAction(`save-${item.id}`, () => saveAgencyEdit(item.id))}
                              aria-label="Save"
                              disabled={isSaving}
                            >
                              {isActionPending(`save-${item.id}`) ? (
                                <span className="inline-flex items-center gap-2">
                                  <Spinner className="size-3" />
                                  Save
                                </span>
                              ) : (
                                "Save"
                              )}
                            </Button>
                            </TooltipTrigger>
                            <TooltipContent>Save</TooltipContent>
                          </Tooltip>
                        )}
                      </>
                    )}

                    {canModerate && (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructiveLight"
                              className="text-xs h-7 px-2"
                              onClick={() => runAction(`reject-${item.id}`, () => setItemStatus(item.id, "rejected"))}
                              aria-label="Reject"
                              disabled={isSaving}
                            >
                              {isActionPending(`reject-${item.id}`) ? (
                                <span className="inline-flex items-center gap-2">
                                  <Spinner className="size-3" />
                                  Reject
                                </span>
                              ) : (
                                "Reject"
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Reject</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="gradient"
                              size="sm"
                              className="text-xs h-7 px-2"
                              onClick={() => runAction(`approve-${item.id}`, () => setItemStatus(item.id, "approved"))}
                              disabled={submission.status === "approved" || isSaving}
                              aria-label="Approve"
                            >
                              {isActionPending(`approve-${item.id}`) ? (
                                <span className="inline-flex items-center gap-2">
                                  <Spinner className="size-3" />
                                  Approve
                                </span>
                              ) : (
                                "Approve"
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Approve</TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  </TooltipProvider>
                </div>
              )}
            </div>
          )
        })}

        {section.dynamic && (
          <>
            {isAgency && dynamicRows.length === 0 && (
              <div className="text-destructive inline-block p-3 text-sm">Client submission pending.</div>
            )}

            {dynamicRows.map((row, index: number) => {
              const dynamicId = `${section.id}-${index}`
              const isEditing = isAgency ? (canEdit ? editMode[dynamicId] || false : false) : true
              const draft = dynamicDrafts[dynamicId] || {
                name: row.name || "",
                url: row.url || "",
              }

              return (
                <div key={`${section.id}-${index}`} className="border-b border-zinc-200 p-3 space-y-2 dark:border-white/10">
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-xs">{row.name || `Row ${index + 1}`}</div>

                    <Badge className={`py-1 px-2 text-xs capitalize ${row?.url ? getStatusBadgeClass(row.status) : "bg-zinc-100 text-zinc-500"}`}>
                      {row?.url ? row.status || "submitted" : "Not Submitted"}
                    </Badge>
                  </div>

                  <Input
                    value={draft.name}
                    disabled={!isEditing}
                    onChange={(event) =>
                      setDynamicDrafts((prev) => ({
                        ...prev,
                        [dynamicId]: {
                          ...draft,
                          name: event.target.value,
                        },
                      }))
                    }
                  />
                  <Input
                    value={draft.url}
                    disabled={!isEditing}
                    onChange={(event) =>
                      setDynamicDrafts((prev) => ({
                        ...prev,
                        [dynamicId]: {
                          ...draft,
                          url: event.target.value,
                        },
                      }))
                    }
                  />

                  {draft.url && isUrlLike(draft.url) && (
                    <a href={draft.url} target="_blank" rel="noreferrer" className="text-xs underline text-blue-600 inline-block">
                      Preview Link
                    </a>
                  )}

                  <div className="flex justify-end items-center gap-2">
                    <TooltipProvider delayDuration={200}>
                      {(canEdit || !isAgency) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructiveLight"
                              className="text-xs h-7 px-2"
                              onClick={() => runAction(`dynamic-remove-${dynamicId}`, () => removeDynamicRow(index))}
                              aria-label="Remove"
                              disabled={isSaving}
                            >
                              {isActionPending(`dynamic-remove-${dynamicId}`) ? (
                                <span className="inline-flex items-center gap-2">
                                  <Spinner className="size-3" />
                                  Remove
                                </span>
                              ) : (
                                "Remove"
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove</TooltipContent>
                        </Tooltip>
                      )}
                      {isAgency && canEdit && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-2"
                              onClick={() => toggleEdit(dynamicId)}
                              aria-label={isEditing ? "Cancel edit" : "Enable edit"}
                            >
                              {isEditing ? "Cancel Edit" : "Enable Edit"}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isEditing ? "Cancel edit" : "Enable edit"}
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {isEditing && isAgency && canEdit && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              className="text-xs h-7 px-2"
                              variant="default"
                              onClick={() => runAction(`dynamic-save-${dynamicId}`, () => saveDynamicRow(index))}
                              disabled={!draft.name.trim() || !draft.url.trim() || isSaving}
                              aria-label="Save"
                            >
                              {isActionPending(`dynamic-save-${dynamicId}`) ? (
                                <span className="inline-flex items-center gap-2">
                                  <Spinner className="size-3" />
                                  Save
                                </span>
                              ) : (
                                "Save"
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Save</TooltipContent>
                        </Tooltip>
                      )}

                      {isAgency && canModerate && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                              size="sm"
                              variant="destructiveLight"
                              className="text-xs h-7 px-2"
                              onClick={() => runAction(`dynamic-reject-${dynamicId}`, () => updateDynamicRow(index, { status: "rejected" }))}
                              aria-label="Reject"
                              disabled={isSaving}
                            >
                              {isActionPending(`dynamic-reject-${dynamicId}`) ? (
                                <span className="inline-flex items-center gap-2">
                                  <Spinner className="size-3" />
                                  Reject
                                </span>
                              ) : (
                                "Reject"
                              )}
                            </Button>
                            </TooltipTrigger>
                            <TooltipContent>Reject</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                              size="sm"
                              className="text-xs h-7 px-2"
                              variant="gradient"
                              onClick={() => runAction(`dynamic-approve-${dynamicId}`, () => updateDynamicRow(index, { status: "approved" }))}
                              disabled={row.status === "approved" || isSaving}
                              aria-label="Approve"
                            >
                              {isActionPending(`dynamic-approve-${dynamicId}`) ? (
                                <span className="inline-flex items-center gap-2">
                                  <Spinner className="size-3" />
                                  Approve
                                </span>
                              ) : (
                                "Approve"
                              )}
                            </Button>
                            </TooltipTrigger>
                            <TooltipContent>Approve</TooltipContent>
                          </Tooltip>
                        </>
                      )}
                    </TooltipProvider>
                  </div>
                </div>
              )
            })}

            {(!isAgency || (isAgency && canEdit)) && (
              <div className="border-b border-zinc-200 bg-white p-3 space-y-2 last-of-type:border-b-0 dark:border-white/10 dark:bg-white/5">
                {localRows.map((row, index) => (
                  <div key={index} className="rounded-lg border border-zinc-200 bg-white overflow-hidden dark:border-white/10 dark:bg-white/5">
                    <Input
                      placeholder="Name"
                      value={row.name}
                      className="h-auto rounded-none border-0 border-b border-zinc-200 py-3! text-xs dark:border-white/10"
                      onChange={(event) => {
                        const updated = [...localRows]
                        updated[index].name = event.target.value
                        setLocalRows(updated)
                      }}
                    />

                    <Input
                      placeholder="URL"
                      value={row.url}
                      className="h-auto rounded-none border-0 border-b border-zinc-200 py-3! text-xs dark:border-white/10"
                      onChange={(event) => {
                        const updated = [...localRows]
                        updated[index].url = event.target.value
                        setLocalRows(updated)
                      }}
                    />

                    <div className="flex gap-2 bg-zinc-50 p-3 dark:bg-white/5">
                      <Button
                        size="sm"
                        variant="default"
                        disabled={!row.name.trim() || !row.url.trim() || isSaving}
                        onClick={() => runAction(`dynamic-submit-${section.id}-${index}`, () => submitDynamicRow(row, index))}
                      >
                        {isActionPending(`dynamic-submit-${section.id}-${index}`) ? (
                          <span className="inline-flex items-center gap-2">
                            <Spinner className="size-3" />
                            {isAgency ? "Save Row" : "Submit Data"}
                          </span>
                        ) : (
                          isAgency ? "Save Row" : "Submit Data"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructiveLight"
                        onClick={() => removeLocalRow(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}

                <Button variant="ghost" onClick={addDynamicRow} className="w-full">
                  + Add New Row
                </Button>
              </div>
            )}
          </>
        )}
        </>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}
