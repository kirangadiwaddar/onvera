"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { Check, ChevronDown, ListTodo, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { LoadingState } from "@/components/loadingState"
import type { ChecklistItem, FieldType, Section } from "@/lib/types"
import { templateStructure } from "@/lib/template-structure"
import { EmptyState } from "@/components/emptyState"
import { toast } from "sonner"
import { BrandingUploader } from "@/components/branding-uploader"

type TemplatePayload = {
  id: string
  title: string
  description: string
  structure?: Section[]
  templateKey?: string
  template_key?: string
}

const DEFAULT_STRUCTURE: Section[] = [
  {
    id: "branding",
    title: "Branding",
    items: [],
    dynamic: true,
  },
  {
    id: "docs",
    title: "Docs",
    items: [],
    dynamic: true,
  },
  {
    id: "drive-links",
    title: "Drive Links",
    items: [],
    dynamic: true,
  },
  {
    id: "spreadsheets",
    title: "Spreadsheets",
    items: [],
    dynamic: true,
  },
  {
    id: "access",
    title: "Access",
    items: [
      { id: "domain-access", label: "Domain Access", type: "predefined", fieldType: "textarea" },
      { id: "hosting-access", label: "Hosting Access", type: "predefined", fieldType: "textarea" },
    ],
  },
]

const getDefaultStructure = (key?: string) => {
  if (!key) return DEFAULT_STRUCTURE
  return templateStructure[key] ?? []
}

const ensureBrandingSection = (sections: Section[], templateKey?: string) => {
  const filtered = sections.filter((section) => section.id !== "branding")
  if (templateKey === "branding") {
    return filtered
  }
  return [
    {
      id: "branding",
      title: "Branding",
      items: [],
      dynamic: true,
    },
    ...filtered,
  ]
}

const isLegacyDefaultStructure = (structure?: Section[]) => {
  if (!structure || structure.length === 0) return false
  return structure.some((section) => section.title?.trim().toLowerCase() === "default checklist")
}

const FIELD_TYPE_OPTIONS: Array<{ value: FieldType; label: string }> = [
  { value: "upload", label: "Upload" },
  { value: "textarea", label: "Textarea" },
  { value: "url", label: "URL" },
]

const createId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `id_${Date.now()}`)

type DeleteTarget =
  | { type: "section"; sectionId: string; title?: string }
  | { type: "item"; sectionId: string; itemId: string; label?: string }

export default function TemplateChecklistPage() {
  const params = useParams()
  const rawId = params?.id
  const joinedId = Array.isArray(rawId) ? rawId.join("/") : rawId
  const templateId = joinedId ? decodeURIComponent(joinedId) : undefined
  const [template, setTemplate] = useState<TemplatePayload | null>(null)
  const [structure, setStructure] = useState<Section[]>(DEFAULT_STRUCTURE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openSectionId, setOpenSectionId] = useState<string | null>(null)
  const sectionTitleRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [showDefaultPrompt, setShowDefaultPrompt] = useState(false)
  const [defaultPromptDismissed, setDefaultPromptDismissed] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  useEffect(() => {
    if (!templateId) return
    const load = async () => {
      try {
        const res = await fetchWithAuth("/api/templates", { cache: "no-store" })
        const payload = await res.json().catch(() => null) as { templates?: TemplatePayload[] } | null
        const found = payload?.templates?.find((item) => item.id === templateId) ?? null
        if (!found) {
          setError("Template not found")
          return
        }
        const templateKey = found.templateKey ?? found.template_key ?? found.id
        setTemplate(found)
        if (templateStructure[templateKey] && isLegacyDefaultStructure(found.structure)) {
          setStructure(ensureBrandingSection(getDefaultStructure(templateKey), templateKey))
          return
        }
        setStructure(
          ensureBrandingSection(
            found.structure?.length ? found.structure : getDefaultStructure(templateKey),
            templateKey,
          ),
        )
      } catch {
        setError("Unable to load template")
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [templateId])

  useEffect(() => {
    if (structure.length === 0) return
    setOpenSectionId((prev) =>
      prev && structure.some((section) => section.id === prev) ? prev : null
    )
  }, [structure])

  useEffect(() => {
    if (!template) return
    const templateKey = template.templateKey ?? template.template_key ?? template.id
    const isCustomTemplate = !templateStructure[templateKey]
    if (!isCustomTemplate) return
    if (structure.length > 0) return
    if (defaultPromptDismissed) return
    setShowDefaultPrompt(true)
  }, [defaultPromptDismissed, structure.length, template])

  const handleSectionTitleChange = (sectionId: string, title: string) => {
    setStructure((prev) =>
      prev.map((section) => (section.id === sectionId ? { ...section, title } : section))
    )
  }

  const handleAddSection = () => {
    const sectionId = createId()
    setStructure((prev) => [
      ...prev,
      {
        id: sectionId,
        title: "New Section",
        items: [],
      },
    ])
    setOpenSectionId(sectionId)
    setEditingSectionId(sectionId)
  }

  const handleRemoveSection = (sectionId: string) => {
    if (sectionId === "branding") return
    setStructure((prev) => prev.filter((section) => section.id !== sectionId))
  }

  const handleAddItem = (sectionId: string) => {
    setStructure((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: [
                ...section.items,
                { id: createId(), label: "", type: "predefined", fieldType: "upload" },
              ],
            }
          : section
      )
    )
  }

  const handleRemoveItem = (sectionId: string, itemId: string) => {
    setStructure((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? { ...section, items: section.items.filter((item) => item.id !== itemId) }
          : section
      )
    )
  }

  const requestDeleteSection = (section: Section) => {
    setDeleteTarget({ type: "section", sectionId: section.id, title: section.title })
  }

  const requestDeleteItem = (sectionId: string, item: ChecklistItem) => {
    setDeleteTarget({ type: "item", sectionId, itemId: item.id, label: item.label })
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    if (deleteTarget.type === "section") {
      handleRemoveSection(deleteTarget.sectionId)
    } else {
      handleRemoveItem(deleteTarget.sectionId, deleteTarget.itemId)
    }
    setDeleteTarget(null)
  }

  const handleItemChange = (
    sectionId: string,
    itemId: string,
    next: Partial<ChecklistItem>
  ) => {
    setStructure((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) => (item.id === itemId ? { ...item, ...next } : item)),
            }
          : section
      )
    )
  }

  const handleSave = async () => {
    if (!templateId) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetchWithAuth(`/api/templates/${encodeURIComponent(templateId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ structure }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { message?: string } | null
        throw new Error(payload?.message || "Unable to update checklist")
      }
      toast.success("Checklist updated")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update checklist"
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const applyDefaultChecklist = () => {
    setStructure(DEFAULT_STRUCTURE)
    setShowDefaultPrompt(false)
    setDefaultPromptDismissed(true)
  }

  const focusSectionTitle = (sectionId: string) => {
    setEditingSectionId(sectionId)
    setOpenSectionId(sectionId)
    requestAnimationFrame(() => {
      const input = sectionTitleRefs.current[sectionId]
      if (!input) return
      input.focus()
    })
  }

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState title="Loading Template" description="Fetching template checklist..." />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-2 px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {/* <h1 className="text-lg font-semibold">{template?.title ?? "Template Checklist"}</h1> */}
            <p className="text-sm">{template?.description}</p>
          </div>
          <div className="right-btns flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Button
              variant="outline"
              className="border border-zinc-300 dark:border-white/10"
              onClick={handleAddSection}
            >
              <Plus className="h-4 w-4" />
              Add section
            </Button>
             <Button variant="gradient" onClick={handleSave} disabled={saving || !templateId}>
            <Check /> {saving ? "Saving..." : "Save checklist"}
          </Button>
          </div>         
        </div>        
      </div>
      <Separator className="my-0 bg-border" />

      <TooltipProvider>
        <div className="space-y-4 px-4 sm:px-6">
          <div className="flex flex-col gap-3">
            <h2 className="flex flex-col gap-1 text-sm font-semibold sm:flex-row sm:items-center sm:gap-3">
              Checklist Builder
              <p className="font-normal text-muted-foreground">
                {template && !templateStructure[template.templateKey ?? template.template_key ?? template.id]
                  ? "Start from scratch or load a default checklist for quick setup."
                  : "Start with the default checklist below and add sections or items as needed."}
              </p>
            </h2>
            
          </div>
          <div className="border rounded-2xl overflow-hidden dark:border-white/10">
          {structure.length === 0 && template && !templateStructure[template.templateKey ?? template.template_key ?? template.id] ? (
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 text-sm text-muted-foreground">
              <span>No checklist yet. Load the default checklist to get started faster.</span>
              <Button variant="outline" size="sm" onClick={applyDefaultChecklist}>
                Load default checklist
              </Button>
            </div>
          ) : null}
          {structure.map((section) => {
            const isOpen = openSectionId === section.id
            const isBranding = section.id === "branding"
            return (
              <Collapsible
                key={section.id}
                open={isOpen}
                onOpenChange={(open) => setOpenSectionId(open ? section.id : null)}
                className="border-b last-of-type:border-b-0 border-zinc-200 dark:border-white/10"
              >
                <div
                  className={`flex items-center gap-3 p-2.5 ${isOpen ? "bg-violet-50 dark:bg-violet-500/10" : ""}`}
                >
                {editingSectionId === section.id && !isBranding ? (
                  <Input
                    value={section.title}
                    onChange={(event) => handleSectionTitleChange(section.id, event.target.value)}
                    className="font-medium shadow-none"
                    autoFocus
                    onBlur={() => setEditingSectionId(null)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur()
                      }
                    }}
                    ref={(node) => {
                      sectionTitleRefs.current[section.id] = node
                    }}
                  />
                ) : (
                  <div className={`flex-1 px-3 py-2 text-sm font-medium leading-5 ${isOpen ? "text-primary" : ""}`}>
                    {section.title}
                  </div>
                )}
                  <div className="flex items-center gap-2">
                    {!isBranding && (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full"
                              onClick={() => focusSectionTitle(section.id)}
                              aria-label="Edit section title"
                            >
                              <Pencil className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Edit title</TooltipContent>
                        </Tooltip>
                        <Button
                          variant="destructiveLight"
                          size="icon"
                          className="rounded-full"
                          onClick={() => requestDeleteSection(section)}
                          aria-label="Remove section"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="shrink-0 rounded-full"
                        aria-label={isOpen ? "Collapse section" : "Expand section"}
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>

                <CollapsibleContent>
                  <div className="border-t border-border px-4 pb-4 pt-4">
                    {isBranding ? (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">
                          Upload your brand logo, guidelines, fonts, and related branding assets.
                        </p>
                        <BrandingUploader disabled />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {section.items.map((item) => (
                            <div key={item.id} className="grid gap-3 sm:grid-cols-[1.4fr_0.8fr_auto]">
                              <Input
                                value={item.label}
                                onChange={(event) =>
                                  handleItemChange(section.id, item.id, { label: event.target.value })
                                }
                                placeholder="Item label"
                              />
                              <div className="right-actions flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                                    <Select
                                value={item.fieldType}
                                onValueChange={(value) =>
                                  handleItemChange(section.id, item.id, { fieldType: value as FieldType })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {FIELD_TYPE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="destructiveLight"
                                size="icon"
                                className="rounded-full self-start sm:self-auto"
                                onClick={() => requestDeleteItem(section.id, item)}
                                aria-label="Remove item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              </div>                          
                            </div>
                          ))}
                        </div>

                        <Button
                          variant="gradient"
                          size="sm"
                          className="mt-3 border border-zinc-300 dark:border-white/10"
                          onClick={() => handleAddItem(section.id)}
                        >
                          <Plus className="h-4 w-4" />
                          Add item
                        </Button>
                      </>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )
          })}

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          {structure.length === 0 ? (
            <EmptyState icon={<ListTodo />} title="Not Found" description=" No sections yet. Add a section to get started." />
          ) : null}
          </div>
        </div>
      </TooltipProvider>
      <AlertDialog
        open={showDefaultPrompt}
        onOpenChange={(open) => {
          setShowDefaultPrompt(open)
          if (!open) setDefaultPromptDismissed(true)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Load default checklist?</AlertDialogTitle>
            <AlertDialogDescription>
              We can prefill your template with a starter checklist. You can edit or remove items anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDefaultPromptDismissed(true)}>
              No, start empty
            </Button>
            <Button variant="gradient" onClick={applyDefaultChecklist}>
              Yes, load defaults
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {deleteTarget?.type === "section" ? "section" : "item"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "section"
                ? `This will permanently remove the "${deleteTarget.title ?? "Untitled"}" section and all its items.`
                : `This will permanently remove the "${deleteTarget?.label ?? "Untitled"}" item.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
