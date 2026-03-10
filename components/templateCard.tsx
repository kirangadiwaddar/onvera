"use client";

import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Globe,
    Palette,
    Smartphone,
    Cloud,
    ShoppingCart,
    Megaphone,
    Brush,
    Plus,
    AppWindowMac,
    FolderOpenDot,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge"
import { getIconColor } from "@/lib/get-icon-colors";
import { ProjectModal, type ProjectFormValues } from "@/components/projects/project-modal";
import { fetchWithAuth } from "@/lib/auth/client-fetch";
import { LoadingState } from "@/components/loadingState";

// import templates from "@/src/mocks/data/templates.json"
// import type { Template } from "@/types/template"

// const templateList = templates.templates

const iconMap = {
    Globe,
    Palette,
    Smartphone,
    Cloud,
    ShoppingCart,
    Megaphone,
    Brush,
    Plus,
    AppWindowMac,
}

type TemplateWithCount = {
    id: string
    title: string
    description: string
    icon: string
    badge: string
    projectsCreated: number
}

export default function TemplateCards() {
    const router = useRouter();
    const [templates, setTemplates] = useState<TemplateWithCount[]>([])
    const [loadingTemplates, setLoadingTemplates] = useState(true)
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateWithCount | null>(null)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        setLoadingTemplates(true)
        fetch("/api/templates", { cache: "no-store" })
            .then((res) => res.json())
            .then((data) => {
                setTemplates(data.templates ?? [])
            })
            .catch(() => {
                setTemplates([])
            })
            .finally(() => {
                setLoadingTemplates(false)
            })
    }, [])

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
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-7 pb-0 pt-0">
                {templates.map((template, index) => {
                    const Icon = iconMap[template.icon as keyof typeof iconMap]
                    return (
                        <Card
                            key={template.id}
                            className="mx-auto w-full p-0 gap-2 shadow-none bg-gradient-violet rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                        >
                            <CardHeader className="flex items-start justify-between gap-4 p-5 pb-2">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-violet-200 bg-white p-2.5 dark:border-white/10 dark:bg-white/5">
                                    {Icon ? (
                                        <Icon className="w-8 h-8" />
                                    ) : (
                                        <div className="w-8 h-8 bg-gray-200 rounded" />
                                    )}
                                </div>
                                <CardAction className="flex items-center justify-end gap-1">
                                    <Badge className={`text-xs font-medium ${getIconColor(index)}`}>
                                        {template.badge}
                                    </Badge>
                                </CardAction>
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
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>

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
        </>
    );
}
