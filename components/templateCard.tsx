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
    Check,
    Lock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AVATAR_COLOR_CLASSES } from "@/lib/avatar-colors";
import { ProjectModal, type ProjectFormValues } from "@/components/projects/project-modal";
import { fetchWithAuth } from "@/lib/auth/client-fetch";
import { useAuth } from "@/components/providers/auth-provider"
import { ProjectsPageSkeleton } from "@/components/dashboard/dashboard-skeleton";
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
import { Spinner } from "@/components/ui/spinner";
import { canUseDefaultTemplates, getPlanLimits, normalizePlan } from "@/lib/billing/plans";

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

const slugify = (value: string) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")

export default function TemplateCards({ canSeed = true }: Props) {
    const router = useRouter();
    const { user, profile, loading: authLoading } = useAuth()
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
    const [ownedProjectCount, setOwnedProjectCount] = useState(0)
    const currentPlan = normalizePlan(
        profile?.plan || (typeof user?.user_metadata?.plan === "string" ? user.user_metadata.plan : null),
    )
    const planLimits = getPlanLimits(currentPlan)
    const templateLimitReached = planLimits.maxTemplates !== null && templates.length >= planLimits.maxTemplates
    const projectLimitReached = planLimits.maxProjects !== null && ownedProjectCount >= planLimits.maxProjects
    const canSeedDefaults = canSeed && canUseDefaultTemplates(currentPlan)
    const seedRemaining = planLimits.maxTemplates === null
        ? Number.POSITIVE_INFINITY
        : Math.max(planLimits.maxTemplates - templates.length, 0)
    const lockedTemplateIds = useMemo(() => {
        if (planLimits.maxTemplates === null) return new Set<string>()
        const sorted = [...templates].sort((a, b) => {
            const aDate = a.createdAt ?? a.created_at
            const bDate = b.createdAt ?? b.created_at
            if (!aDate && !bDate) return 0
            if (!aDate) return 1
            if (!bDate) return -1
            return new Date(bDate).getTime() - new Date(aDate).getTime()
        })
        const locked = sorted.slice(planLimits.maxTemplates).map((template) => template.id)
        return new Set(locked)
    }, [planLimits.maxTemplates, templates])

    useEffect(() => {
        if (authLoading) return
        if (!user?.id) {
            setOwnedProjectCount(0)
            return
        }
        const loadProjectCount = async () => {
            try {
                const res = await fetchWithAuth("/api/projects?cache=0", { cache: "no-store" })
                if (!res.ok) return
                const data = await res.json().catch(() => null) as { projects?: Array<{ createdBy?: string | null }> } | null
                const projects = Array.isArray(data?.projects) ? data!.projects! : []
                const ownedCount = projects.filter((project) => project.createdBy === user.id).length
                setOwnedProjectCount(ownedCount)
            } catch {
                setOwnedProjectCount(0)
            }
        }
        void loadProjectCount()
    }, [authLoading, user?.id])

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

    const notifyTemplateLocked = () => {
        toast.error("Template is locked on your current plan.")
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
        if (!canSeedDefaults) return
        if (loadingTemplates) return
        if (templates.length > 0) return
        if (seedPromptDismissed) return
        if (seedRemaining <= 0) return
        setShowSeedPrompt(true)
    }, [canSeedDefaults, loadingTemplates, seedPromptDismissed, seedRemaining, templates.length])

    useEffect(() => {
        if (!showSeedPrompt || !canSeedDefaults) return
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
                setSelectedSeedKeys([])
            })
            .catch(() => {
                setDefaultTemplates([])
                toast.error("Default templates are not available yet.")
            })
            .finally(() => {
                setLoadingDefaults(false)
            })
    }, [canSeedDefaults, showSeedPrompt, templates])

    const existingSeedIds = new Set(
        templates.map((template): string => template.template_key ?? slugify(template.title ?? template.id))
    )
    const selectableSeedTemplates = defaultTemplates.filter(
        (template: DefaultTemplate) => !existingSeedIds.has(template.template_key ?? template.id)
    )

    const handleCreateProject = async (values: ProjectFormValues) => {
        if (projectLimitReached) {
            toast.error("Project limit reached for your plan.")
            return
        }
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

            const data = await res.json().catch(() => null) as { message?: string; slug?: string } | null
            if (!res.ok) {
                throw new Error(data?.message || "Failed to create project")
            }
            setIsCreateOpen(false)
            setSelectedTemplate(null)

            if (data?.slug) {
                setOwnedProjectCount((prev) => prev + 1)
                router.push(`/projects/${data.slug}`)
                return
            }

            router.push("/projects")
        } catch (error) {
            console.error("Template project creation failed:", error)
            toast.error(error instanceof Error ? error.message : "Failed to create project")
        } finally {
            setSubmitting(false)
        }
    }

    const handleCreateTemplate = async (values: { title: string; description: string }) => {
        if (templateLimitReached) {
            toast.error("Template limit reached for your plan.")
            return
        }
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
            toast.error(error instanceof Error ? error.message : "Failed to create template")
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
            setTemplates((prev) => prev.filter((template) => template.id !== templateToDelete.id))
            setTemplateToDelete(null)
            toast.success("Template deleted")
        } catch (error) {
            console.error("Template deletion failed:", error)
            toast.error(error instanceof Error ? error.message : "Failed to delete template")
        } finally {
            setSubmitting(false)
        }
    }

    const handleSeedTemplates = async () => {
        if (!canSeedDefaults) {
            toast.error("Default templates are not available on your plan.")
            return
        }
        if (seedRemaining <= 0) {
            toast.error("Template limit reached for your plan.")
            return
        }
        setSubmitting(true)
        try {
            const existingIds = new Set(
                templates.map((template): string => template.template_key ?? slugify(template.title ?? template.id))
            )
            const toCreate = defaultTemplates.filter((template: DefaultTemplate) =>
                selectedSeedKeys.includes(template.template_key ?? template.id)
                && !existingIds.has(template.template_key ?? template.id)
            )
            if (selectedSeedKeys.length === 0) {
                toast.error("Select at least one template")
                return
            }
            if (selectedSeedKeys.length > seedRemaining) {
                toast.error(`You can only add ${seedRemaining} more template${seedRemaining === 1 ? "" : "s"}.`)
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
        return <ProjectsPageSkeleton />
    }

    return (
        <>
            <div className="flex flex-col gap-4 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
                <p className="text-sm flex-1 lg:line-clamp-2">Stop starting from scratch — build smarter with structured templates.</p>
                <div className="right-actions flex w-full flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:w-auto">
                    <div className="right-combine-actions flex items-center justify-between gap-3 sm:justify-end">
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
                        disabled={!canSeedDefaults || seedRemaining <= 0}
                    >
                        <LayoutPanelTop />
                        Default templates
                    </Button>
                    </div>
                    <Button
                        variant="gradient"
                        onClick={() => {
                            if (templateLimitReached) {
                                toast.error("Template limit reached for your plan.")
                                return
                            }
                            setEditingTemplate(null)
                            setShowTemplateModal(true)
                        }}
                        disabled={submitting}
                    >
                        <Plus strokeWidth={2} /> New Template
                    </Button>                    
                </div>
            </div>
            <Separator className="my-0 bg-border" />
            {templates.length === 0 ? (
                <div className="px-4 pt-0 pb-0 sm:px-6">
                    <EmptyState
                        icon={<LayoutPanelTop />}
                        title="No templates yet"
                        description="Add your own template or seed the predefined set to get started."
                        buttonText={canSeedDefaults && seedRemaining > 0 ? "Load default templates" : undefined}
                        onClick={canSeedDefaults && seedRemaining > 0 ? () => setShowSeedPrompt(true) : undefined}
                    />
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 gap-4 px-4 pt-0 pb-0 sm:px-6 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {templates.map((template, index) => {
                        const avatarClassName = AVATAR_COLOR_CLASSES[index % AVATAR_COLOR_CLASSES.length]
                        const isTemplateLocked = lockedTemplateIds.has(template.id)
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
                                     <div className="flex items-center gap-2">
                                     {isTemplateLocked ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                                                <Lock className="size-3" />
                                                Locked
                                            </span>
                                        ) : null}
                                     <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="-mt-2 -mr-1">
                                                    <MoreVertical className="size-5" strokeWidth={2} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-lg">
                                                <DropdownMenuItem
                                                    onSelect={() => {
                                                        if (isTemplateLocked) {
                                                            notifyTemplateLocked()
                                                            return
                                                        }
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
                                                    if (isTemplateLocked) {
                                                        notifyTemplateLocked()
                                                        return
                                                    }
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
                                </CardHeader>

                                <CardContent className="flex-1 mb-3 px-5">
                                    <CardTitle className="font-medium text-sm truncate mb-2">{template.title}</CardTitle>
                                    <p className="text-sm text-muted-foreground line-clamp-2 min-w-0">
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
                                                    onClick={() => {
                                                        if (isTemplateLocked) {
                                                            notifyTemplateLocked()
                                                            return
                                                        }
                                                        router.push(`/templates/${encodeURIComponent(template.id)}`)
                                                    }}
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
                                                        if (isTemplateLocked) {
                                                            notifyTemplateLocked()
                                                            return
                                                        }
                                                        if (projectLimitReached) {
                                                            toast.error("Project limit reached for your plan.")
                                                            return
                                                        }
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
                <div className="px-4 pt-0 pb-0 sm:px-6">
                    <div className="rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
                        <Table className="text-sm [&_th]:px-5 [&_th]:py-3 [&_td]:px-5 [&_td]:py-4">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Template</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Projects</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {templates.map((template) => {
                                    const isTemplateLocked = lockedTemplateIds.has(template.id)
                                    return (
                                        <TableRow key={template.id}>
                                            <TableCell className="font-medium">
                                                <Link
                                                    href={`/templates/${encodeURIComponent(template.id)}`}
                                                    className={`hover:underline ${isTemplateLocked ? "pointer-events-none text-muted-foreground" : ""}`}
                                                    onClick={(event) => {
                                                        if (isTemplateLocked) {
                                                            event.preventDefault()
                                                            notifyTemplateLocked()
                                                        }
                                                    }}
                                                >
                                                    {template.title}
                                                </Link>
                                                {isTemplateLocked ? (
                                                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-200">
                                                        <Lock className="size-3" />
                                                        Locked
                                                    </span>
                                                ) : null}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{template.description}</TableCell>
                                            <TableCell>{template.projectsCreated}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            if (isTemplateLocked) {
                                                                notifyTemplateLocked()
                                                                return
                                                            }
                                                            router.push(`/templates/${encodeURIComponent(template.id)}`)
                                                        }}
                                                    >
                                                        Manage
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => {
                                                            if (isTemplateLocked) {
                                                                notifyTemplateLocked()
                                                                return
                                                            }
                                                            if (projectLimitReached) {
                                                                toast.error("Project limit reached for your plan.")
                                                                return
                                                            }
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
                                                                    if (isTemplateLocked) {
                                                                        notifyTemplateLocked()
                                                                        return
                                                                    }
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
                                                                    if (isTemplateLocked) {
                                                                        notifyTemplateLocked()
                                                                        return
                                                                    }
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
                                    )
                                })}
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

            <ProjectModal
                key={selectedTemplate?.id ?? "create-project"}
                open={Boolean(isCreateOpen && selectedTemplate)}
                onOpenChange={(open) => {
                    setIsCreateOpen(open)
                    if (!open) {
                        window.setTimeout(() => setSelectedTemplate(null), 300)
                    }
                }}
                mode="create"
                templates={templates.map((template) => ({
                    id: template.id,
                    title: template.title,
                }))}
                fixedTemplateId={selectedTemplate?.id ?? ""}
                initialValues={{
                    title: "",
                    avatarSrc: "",
                    templateId: selectedTemplate?.id ?? "",
                }}
                loading={submitting}
                onSubmit={handleCreateProject}
            />

            <TemplateModal
                open={showTemplateModal}
                onOpenChange={(open) => {
                    setShowTemplateModal(open)
                    if (!open) {
                        window.setTimeout(() => setEditingTemplate(null), 300)
                    }
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

            {canSeedDefaults ? (
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
                    <DialogContent className="overflow-hidden sm:max-w-2xl">
                        <DialogHeader>
                            <div>
                                <DialogTitle>Select the templates you want to add</DialogTitle>
                                {/* <DialogDescription>
                                    Select the templates you want to add.
                                </DialogDescription> */}
                            </div>
                        </DialogHeader>
                        <div className="space-y-4">
                            {loadingDefaults ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Spinner className="h-3.5 w-3.5" />
                                    Loading default templates...
                                </div>
                            ) : null}
                            {!loadingDefaults && defaultTemplates.length === 0 ? (
                                <div className="text-xs text-muted-foreground">
                                    No default templates found.
                                </div>
                            ) : null}
                            <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                                <span className="text-xs">
                                    Choose up to {Number.isFinite(seedRemaining) ? seedRemaining : "all"} templates
                                </span>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        className="rounded-full border border-transparent px-2 py-1 text-xs text-violet-700 hover:border-violet-200 hover:bg-violet-50 dark:hover:border-violet-500/30 dark:hover:bg-violet-500/10"
                                        onClick={() => {
                                            const keys = selectableSeedTemplates.map((t) => t.template_key ?? t.id)
                                            if (seedRemaining !== Number.POSITIVE_INFINITY) {
                                                setSelectedSeedKeys(keys.slice(0, seedRemaining))
                                                return
                                            }
                                            setSelectedSeedKeys(keys)
                                        }}
                                        disabled={loadingDefaults}
                                    >
                                        Select all ({selectedSeedKeys.length})
                                    </button>
                                    <button
                                        type="button"
                                        className="rounded-full border border-transparent px-2 py-1 text-xs text-zinc-600 hover:border-zinc-200 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:border-white/10 dark:hover:bg-white/5"
                                        onClick={() => setSelectedSeedKeys([])}
                                        disabled={loadingDefaults}
                                    >
                                        Clear all
                                    </button>
                                </div>
                            </div>
                            <div className="grid max-h-[45vh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                                {defaultTemplates.map((template: DefaultTemplate) => {
                                    const key = template.template_key ?? template.id
                                    const checked = selectedSeedKeys.includes(key)
                                    const isExisting = existingSeedIds.has(key)
                                    const limitReached = !checked && selectedSeedKeys.length >= seedRemaining
                                    return (
                                        <label
                                            key={template.id}
                                            className={`group flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm transition cursor-pointer ${
                                                isExisting
                                                    ? "border-dashed border-zinc-200 bg-zinc-50 text-muted-foreground opacity-70 dark:border-white/10 dark:bg-white/5"
                                                    : checked
                                                        ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                                                        : "border-zinc-200 hover:border-emerald-200 hover:bg-emerald-50/40 dark:border-white/10 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/10"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={checked}
                                                disabled={isExisting || limitReached}
                                                onChange={(event) => {
                                                    const nextChecked = event.target.checked
                                                    setSelectedSeedKeys((prev) =>
                                                        nextChecked
                                                            ? [...prev, key]
                                                            : prev.filter((value) => value !== key)
                                                    )
                                                }}
                                            />
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium leading-5">{template.title}</p>
                                                <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                                                {isExisting ? (
                                                    <p className="text-xs text-emerald-600 mt-1">Already added</p>
                                                ) : null}
                                            </div>
                                            <span
                                                className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
                                                    checked
                                                        ? "border-emerald-500 bg-emerald-500 text-white"
                                                        : "border-zinc-300 text-transparent dark:border-white/20"
                                                }`}
                                            >
                                                <span className="text-sm font-semibold"><Check size={14} /></span>
                                            </span>
                                        </label>
                                    )
                                })}
                            </div>
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
