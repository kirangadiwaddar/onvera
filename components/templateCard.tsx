"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TemplateModal } from "@/components/templates/template-modal";
import {
    Plus,
    Pencil,
    MoreHorizontal,
    FolderOpenDot,
    Trash2,
    MoreVertical,
    List,
    LayoutGrid,
    LayoutPanelTop,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAvatarColor } from "@/lib/get-avatar-colors";
import { ProjectModal, type ProjectFormValues } from "@/components/projects/project-modal";
import { fetchWithAuth } from "@/lib/auth/client-fetch";
import { useAuth } from "@/components/providers/auth-provider"
import { LoadingState } from "@/components/loadingState";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "./ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { EmptyState } from "@/components/emptyState";

// import templates from "@/src/mocks/data/templates.json"
// import type { Template } from "@/types/template"

// const templateList = templates.templates

import type { Section } from "@/lib/types";

type TemplateWithCount = {
    id: string
    title: string
    description: string
    icon: string
    badge: string
    projectsCreated: number
    createdAt?: string
    created_at?: string
    template_key?: string
    structure?: Section[]
}

type DefaultTemplate = {
    id: string
    title: string
    description: string
    icon?: string
    badge?: string
    structure?: Section[]
    template_key?: string
}

type Props = {
    canSeed?: boolean
}

export default function TemplateCards({ canSeed = true }: Props) {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth()
    const storageKey = user?.id ? `onvera:seed-templates-dismissed:${user.id}` : null
    const [templates, setTemplates] = useState<TemplateWithCount[]>([])
    const [loadingTemplates, setLoadingTemplates] = useState(true)
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateWithCount | null>(null)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [showTemplateModal, setShowTemplateModal] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState<TemplateWithCount | null>(null)
    const [templateToDelete, setTemplateToDelete] = useState<TemplateWithCount | null>(null)
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [showSeedPrompt, setShowSeedPrompt] = useState(false)
    const [seedPromptDismissed, setSeedPromptDismissed] = useState(false)
    const [selectedSeedKeys, setSelectedSeedKeys] = useState<string[]>([])
    const [defaultTemplates, setDefaultTemplates] = useState<DefaultTemplate[]>([])
    const [loadingDefaults, setLoadingDefaults] = useState(false)

    const loadTemplates = (silent = false) => {
        if (!silent) setLoadingTemplates(true)
        fetchWithAuth("/api/templates", { cache: "no-store" })
            .then((res) => res.json())
            .then((data) => {
                const nextTemplates = Array.isArray(data?.templates) ? [...data.templates] : []
                nextTemplates.sort((a: TemplateWithCount, b: TemplateWithCount) => {
                    const aDate = a.createdAt ?? a.created_at
                    const bDate = b.createdAt ?? b.created_at
                    if (!aDate && !bDate) return 0
                    if (!aDate) return 1
                    if (!bDate) return -1
                    return new Date(bDate).getTime() - new Date(aDate).getTime()
                })
                setTemplates(nextTemplates)
            })
            .catch(() => {
                setTemplates([])
            })
            .finally(() => {
                if (!silent) setLoadingTemplates(false)
            })
    }

    useEffect(() => {
        if (authLoading) return
        if (!user?.id) {
            setTemplates([])
            setLoadingTemplates(false)
            return
        }
        if (storageKey && typeof window !== "undefined") {
            const stored = window.localStorage.getItem(storageKey)
            setSeedPromptDismissed(stored === "1")
        } else {
            setSeedPromptDismissed(false)
        }
        loadTemplates()
    }, [authLoading, storageKey, user?.id])

    const persistSeedDismissed = (dismissed: boolean) => {
        if (!storageKey || typeof window === "undefined") return
        if (dismissed) {
            window.localStorage.setItem(storageKey, "1")
        } else {
            window.localStorage.removeItem(storageKey)
        }
    }

    useEffect(() => {
        if (!canSeed) return
        if (loadingTemplates) return
        if (templates.length > 0) return
        if (seedPromptDismissed) return
        setShowSeedPrompt(true)
    }, [canSeed, loadingTemplates, seedPromptDismissed, templates.length])

    useEffect(() => {
        if (!showSeedPrompt) return
        setLoadingDefaults(true)
        fetchWithAuth("/api/templates/defaults", { cache: "no-store" })
            .then(async (res) => {
                const data = await res.json().catch(() => null)
                if (!res.ok) {
                    const message = data?.message || "Failed to load default templates"
                    throw new Error(message)
                }
                return data
            })
            .then((data) => {
                const next = Array.isArray(data?.templates) ? (data.templates as DefaultTemplate[]) : []
                setDefaultTemplates(next)
                const existingKeys = new Set(templates.map((template): string => template.template_key ?? template.id))
                const defaults = next
                    .map((template): string => template.template_key ?? template.id)
                    .filter((key: string) => !existingKeys.has(key))
                setSelectedSeedKeys(defaults)
            })
            .catch(() => {
                setDefaultTemplates([])
                toast.error("Default templates are not available yet.")
            })
            .finally(() => {
                setLoadingDefaults(false)
            })
    }, [showSeedPrompt, templates])

    const existingSeedIds = new Set(templates.map((template): string => template.template_key ?? template.id))
    const selectableSeedTemplates = defaultTemplates.filter(
        (template: DefaultTemplate) => !existingSeedIds.has(template.template_key ?? template.id)
    )

    const handleCreateProject = async (values: ProjectFormValues) => {
        setSubmitting(true)
        try {
            const res = await fetchWithAuth("/api/projects", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: values.title,
                    avatarSrc: values.avatarSrc,
                    templateId: values.templateId,
                    status: "waiting",
                }),
            })

            if (!res.ok) {
                throw new Error("Failed to create project")
            }

            const data = await res.json()
            setIsCreateOpen(false)
            setSelectedTemplate(null)

            if (data?.slug) {
                router.push(`/projects/${data.slug}`)
                return
            }

            router.push("/projects")
        } catch (error) {
            console.error("Template project creation failed:", error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleCreateTemplate = async (values: { title: string; description: string }) => {
        setSubmitting(true)
        try {
            const res = await fetchWithAuth("/api/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            })

            if (!res.ok) {
                const payload = await res.json().catch(() => null) as { message?: string } | null
                throw new Error(payload?.message || "Failed to create template")
            }

            setShowTemplateModal(false)
            loadTemplates(true)
        } catch (error) {
            console.error("Template creation failed:", error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleUpdateTemplate = async (values: { title: string; description: string }) => {
        if (!editingTemplate?.id) return
        setSubmitting(true)
        try {
            const res = await fetchWithAuth(`/api/templates/${encodeURIComponent(editingTemplate.id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            })

            if (!res.ok) {
                const payload = await res.json().catch(() => null) as { message?: string } | null
                throw new Error(payload?.message || "Failed to update template")
            }

            setEditingTemplate(null)
            setShowTemplateModal(false)
            loadTemplates(true)
        } catch (error) {
            console.error("Template update failed:", error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteTemplate = async () => {
        if (!templateToDelete) return
        if (templateToDelete.projectsCreated > 0) {
            toast.error("This template has active projects. Remove projects first.")
            return
        }
        setSubmitting(true)
        try {
            const res = await fetchWithAuth(`/api/templates/${encodeURIComponent(templateToDelete.id)}`, {
                method: "DELETE",
            })
            if (!res.ok) {
                const payload = await res.json().catch(() => null) as { message?: string } | null
                throw new Error(payload?.message || "Failed to delete template")
            }
            setTemplateToDelete(null)
            loadTemplates(true)
        } catch (error) {
            console.error("Template deletion failed:", error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleSeedTemplates = async () => {
        setSubmitting(true)
        try {
            const existingIds = new Set(templates.map((template): string => template.template_key ?? template.id))
            const toCreate = defaultTemplates.filter((template: DefaultTemplate) =>
                selectedSeedKeys.includes(template.template_key ?? template.id)
                && !existingIds.has(template.template_key ?? template.id)
            )
            if (selectedSeedKeys.length === 0) {
                toast.error("Select at least one template")
                return
            }
            if (toCreate.length > 0) {
                await Promise.all(
                    toCreate.map((template: DefaultTemplate) =>
                                fetchWithAuth("/api/templates", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        title: template.title,
                                        description: template.description,
                                        icon: template.icon ?? "Globe",
                                        badge: template.badge ?? "Default",
                                        structure: template.structure ?? [],
                                        templateKey: template.template_key ?? template.id,
                                    }),
                                }).then(async (res) => {
                            if (!res.ok) {
                                const payload = await res.json().catch(() => null) as { message?: string } | null
                                throw new Error(payload?.message || "Failed to create template")
                            }
                        })
                    )
                )
            }
            toast.success("Predefined templates added")
            setShowSeedPrompt(false)
            setSeedPromptDismissed(true)
            persistSeedDismissed(true)
            loadTemplates(true)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to add templates")
        } finally {
            setSubmitting(false)
        }
    }

    if (loadingTemplates) {
        return (
            <LoadingState
                title="Loading Templates"
                description="Fetching your project templates."
            />
        )
    }

    return (
        <>
            <div className="flex items-center justify-between px-7 pt-0">
                <p className="text-sm flex-1 lg:line-clamp-2">Stop starting from scratch — build smarter with structured templates.</p>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white/70 p-1 dark:border-white/10 dark:bg-white/5">
                        <Button
                            size="icon-sm"
                            variant={viewMode === "grid" ? "secondary" : "ghost"}
                            className="rounded-full"
                            onClick={() => setViewMode("grid")}
                            aria-pressed={viewMode === "grid"}
                            aria-label="Grid view"
                        >
                            <LayoutGrid className="size-4" />
                        </Button>
                        <Button
                            size="icon-sm"
                            variant={viewMode === "list" ? "secondary" : "ghost"}
                            className="rounded-full"
                            onClick={() => setViewMode("list")}
                            aria-pressed={viewMode === "list"}
                            aria-label="List view"
                        >
                            <List className="size-4" />
                        </Button>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => setShowSeedPrompt(true)}
                    >
                        <LayoutPanelTop />
                        Default templates
                    </Button>
                    <Button
                        variant="gradient"
                        onClick={() => {
                            setEditingTemplate(null)
                            setShowTemplateModal(true)
                        }}
                    >
                        <Plus strokeWidth={2} /> New Template
                    </Button>                    
                </div>
            </div>
            <Separator className="my-0 bg-border" />
            {templates.length === 0 ? (
                <div className="p-7 pb-0 pt-0">
                    <EmptyState
                        icon={<LayoutPanelTop />}
                        title="No templates yet"
                        description="Add your own template or seed the predefined set to get started."
                        buttonText="Load default templates"
                        onClick={() => setShowSeedPrompt(true)}
                    />
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-7 pb-0 pt-0">
                    {templates.map((template, index) => {
                        void index
                        const avatarClassName = getAvatarColor(template.id)
                        return (
                            <Card
                                key={template.id}
                                className="mx-auto w-full p-0 gap-2 shadow-none bg-gradient-violet rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                            >
                            <CardHeader className="flex items-start justify-between gap-4 p-5 pb-2">
                                    <div className="h-10 w-10">
                                        <div
                                            className={`relative h-10 w-10 rounded-full overflow-hidden ${avatarClassName}`}
                                        >
                                            <span
                                                className="pointer-events-none absolute inset-0 opacity-20 mix-blend-soft-light"
                                                style={{
                                                    backgroundImage:
                                                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='80' height='80' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E\")",
                                                }}
                                            />
                                        </div>
                                    </div>
                                     <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="-mt-2 -mr-1">
                                                    <MoreVertical className="size-5" strokeWidth={2} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-lg">
                                                <DropdownMenuItem
                                                    onSelect={() => {
                                                        setEditingTemplate(template)
                                                        setShowTemplateModal(true)
                                                    }}
                                                    className="text-xs!"
                                                >
                                                    <Pencil />
                                                    Edit
                                                </DropdownMenuItem>
                                            <DropdownMenuItem
                                                variant="destructive"
                                                onSelect={() => {
                                                    if (template.projectsCreated > 0) {
                                                        toast.error("This template has active projects. Remove projects first.")
                                                        return
                                                    }
                                                    setTemplateToDelete(template)
                                                }}
                                                className="text-xs!"
                                            >
                                                <Trash2 />
                                                Delete
                                            </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                </CardHeader>

                                <CardContent className="flex-1 mb-3 px-5">
                                    <CardTitle className="font-medium text-sm truncate mb-2">{template.title}</CardTitle>
                                    <p className="text-xs text-muted-foreground line-clamp-2 min-w-0">
                                        {template.description}
                                    </p>
                                </CardContent>

                                <CardFooter className="border-t py-4! text-xs text-muted-foreground flex items-center justify-between">
                                    <span className="flex items-center gap-1 justify-start">
                                        <strong className="font-medium text-foreground mt-0.5 text-xs flex items-center gap-1">
                                            <FolderOpenDot size={16} /> {template.projectsCreated} Projects Created
                                        </strong>
                                    </span>

                                    <div className="flex items-center gap-2">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="text-xs rounded-full"
                                                    onClick={() => router.push(`/templates/${encodeURIComponent(template.id)}`)}
                                                >
                                                    <List className="text-primary" strokeWidth={2} />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Manage Checklist</p>
                                            </TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="text-xs rounded-full"
                                                    onClick={() => {
                                                        setSelectedTemplate(template)
                                                        setIsCreateOpen(true)
                                                    }}
                                                >
                                                    <Plus className="text-primary" strokeWidth={2} />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Create Project</p>
                                            </TooltipContent>
                                        </Tooltip>
                                       
                                    </div>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            ) : (
                <div className="p-7 pb-0 pt-0">
                    <div className="rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
                        <Table className="[&_th]:px-5 [&_th]:py-3 [&_td]:px-5 [&_td]:py-4 text-sm">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Template</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Projects</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {templates.map((template) => (
                                    <TableRow key={template.id}>
                                        <TableCell className="font-medium">
                                            <Link href={`/templates/${encodeURIComponent(template.id)}`} className="hover:underline">
                                                {template.title}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{template.description}</TableCell>
                                        <TableCell>{template.projectsCreated}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => router.push(`/templates/${encodeURIComponent(template.id)}`)}
                                                >
                                                    Manage
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => {
                                                        setSelectedTemplate(template)
                                                        setIsCreateOpen(true)
                                                    }}
                                                >
                                                    New Project
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="size-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-lg">
                                                        <DropdownMenuItem
                                                            onSelect={() => {
                                                                setEditingTemplate(template)
                                                                setShowTemplateModal(true)
                                                            }}
                                                            className="text-xs!"
                                                        >
                                                            <Pencil />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            variant="destructive"
                                                            onSelect={() => {
                                                                if (template.projectsCreated > 0) {
                                                                    toast.error("This template has active projects. Remove projects first.")
                                                                    return
                                                                }
                                                                setTemplateToDelete(template)
                                                            }}
                                                            className="text-xs!"
                                                        >
                                                            <Trash2 />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            <AlertDialog
                open={Boolean(templateToDelete)}
                onOpenChange={(open) => setTemplateToDelete(open ? templateToDelete : null)}
            >
                <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. Templates used by projects may not be deletable.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={submitting}
                            onClick={() => void handleDeleteTemplate()}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {isCreateOpen && selectedTemplate ? (
                <ProjectModal
                    key={selectedTemplate.id}
                    open={isCreateOpen}
                    onOpenChange={(open) => {
                        setIsCreateOpen(open)
                        if (!open) setSelectedTemplate(null)
                    }}
                    mode="create"
                    templates={templates.map((template) => ({
                        id: template.id,
                        title: template.title,
                    }))}
                    fixedTemplateId={selectedTemplate.id}
                    initialValues={{
                        title: "",
                        avatarSrc: "",
                        templateId: selectedTemplate.id,
                    }}
                    loading={submitting}
                    onSubmit={handleCreateProject}
                />
            ) : null}

            {showTemplateModal ? (
                <TemplateModal
                    open={showTemplateModal}
                    onOpenChange={(open) => {
                        setShowTemplateModal(open)
                        if (!open) setEditingTemplate(null)
                    }}
                    mode={editingTemplate ? "edit" : "create"}
                    loading={submitting}
                    initialValues={
                        editingTemplate
                            ? {
                                title: editingTemplate.title,
                                description: editingTemplate.description,
                            }
                            : undefined
                    }
                    onSubmit={(values) => {
                        if (editingTemplate) {
                            handleUpdateTemplate(values)
                            return
                        }
                        handleCreateTemplate(values)
                    }}
                />
            ) : null}

            {canSeed ? (
                <Dialog
                    open={showSeedPrompt}
                    onOpenChange={(open) => {
                        setShowSeedPrompt(open)
                        if (!open) {
                            setSeedPromptDismissed(true)
                            persistSeedDismissed(true)
                        }
                    }}
                >
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add predefined templates?</DialogTitle>
                            <DialogDescription>
                                Select the templates you want to add.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                            {loadingDefaults ? (
                                <div className="text-sm text-muted-foreground">Loading default templates...</div>
                            ) : null}
                            {!loadingDefaults && defaultTemplates.length === 0 ? (
                                <div className="text-sm text-muted-foreground">
                                    No default templates found.
                                </div>
                            ) : null}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{selectedSeedKeys.length} selected</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        className="text-violet-600 hover:text-violet-700"
                                        onClick={() => setSelectedSeedKeys(selectableSeedTemplates.map((t) => t.template_key ?? t.id))}
                                        disabled={loadingDefaults}
                                    >
                                        Select all
                                    </button>
                                    <span className="text-zinc-300">|</span>
                                    <button
                                        type="button"
                                        className="text-zinc-600 hover:text-zinc-700"
                                        onClick={() => setSelectedSeedKeys([])}
                                        disabled={loadingDefaults}
                                    >
                                        Clear all
                                    </button>
                                </div>
                            </div>
                            {defaultTemplates.map((template: DefaultTemplate) => {
                                const key = template.template_key ?? template.id
                                const checked = selectedSeedKeys.includes(key)
                                const isExisting = existingSeedIds.has(key)
                                return (
                                    <label
                                        key={template.id}
                                        className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
                                            isExisting
                                                ? "border-dashed border-zinc-200 bg-zinc-50 text-muted-foreground opacity-70 dark:border-white/10 dark:bg-white/5"
                                                : "border-zinc-200 dark:border-white/10"
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="mt-0.5 h-4 w-4 accent-violet-600"
                                            checked={checked}
                                            disabled={isExisting}
                                            onChange={(event) => {
                                                const nextChecked = event.target.checked
                                                setSelectedSeedKeys((prev) =>
                                                    nextChecked
                                                        ? [...prev, key]
                                                        : prev.filter((value) => value !== key)
                                                )
                                            }}
                                        />
                                        <div>
                                            <p className="font-medium">{template.title}</p>
                                            <p className="text-xs text-muted-foreground">{template.description}</p>
                                            {isExisting ? (
                                                <p className="text-[11px] text-emerald-600 mt-1">Already added</p>
                                            ) : null}
                                        </div>
                                    </label>
                                )
                            })}
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowSeedPrompt(false)
                                    setSeedPromptDismissed(true)
                                    persistSeedDismissed(true)
                                }}
                                disabled={submitting}
                            >
                                No, keep empty
                            </Button>
                            <Button
                                variant="gradient"
                                onClick={() => void handleSeedTemplates()}
                                disabled={submitting}
                            >
                                Add templates
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            ) : null}

        </>
    );
}
