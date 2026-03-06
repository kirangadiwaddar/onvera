"use client"

import { useState } from "react"
import Link from "next/link"

import {
    CalendarCheck,
    MoreVertical,
    PencilIcon,
    Share2,
    TrashIcon,
} from "lucide-react"

import {
    Card,
    CardAction,
    CardContent,
    CardFooter,
    CardHeader,
} from "@/components/ui/card"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import {
    Avatar,
    AvatarImage,
    AvatarFallback,
    AvatarGroup,
    AvatarGroupCount,
} from "@/components/ui/avatar"

import { getAvatarColor } from "@/lib/get-avatar-colors"
import { status } from "@/lib/project-status"

import { ProjectDialog } from "@/components/project-dialog"
import { DeleteProjectDialog } from "./delete-project-dialog"

import { Project } from "@/types/project"
import { ProjectActions } from "./projectActions"

export interface ProjectCardProps {
    id: number
    slug: string
    title: string
    templateTitle?: string
    template_id?: string
    status?: status
    avatar_src?: string
    created_at?: string

    teams?: {
        id: number
        name: string
    }[]

    members?: {
        id: number
        name: string
        avatar_src?: string
    }[]
    project: Project & {
        templateTitle?: string
    }
    onEdit?: (project: Project) => void
    onDelete?: (id: number) => void
    onShare?: () => void

    variant?: "default" | "compact"
}

export function ProjectCard({
    id,
    slug,
    title,
    templateTitle,
    template_id,
    status,
    avatar_src,
    created_at,
    teams = [],
    members = [],
    onEdit,
    onDelete,
    onShare,
    project,
    variant = "default",
}: ProjectCardProps) {


    const [editOpen, setEditOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)

    const statusStyles: Record<status, string> = {
        completed: "bg-emerald-100 text-emerald-700",
        overdue: "bg-rose-100 text-rose-700",
        waiting: "bg-amber-100 text-amber-700",
        ongoing: "bg-blue-100 text-blue-700",
        onhold: "bg-violet-100 text-violet-700",
    }

    const statusLabel: Record<status, string> = {
        completed: "Completed",
        overdue: "Overdue",
        waiting: "Waiting",
        ongoing: "Ongoing",
        onhold: "On Hold",
    }

    const formattedDate =
        created_at &&
        new Date(created_at).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        })

    const MAX_VISIBLE = 3
    const visibleMembers = members.slice(0, MAX_VISIBLE)
    const remainingCount = members.length - MAX_VISIBLE

    return (
        <>
            <Link href={`/projects/${slug}`} className="block">
            <Card className="mx-auto w-full p-0 gap-2 shadow-none bg-gradient-violet rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">

                <CardHeader className="p-5 pb-0">

                    <Avatar className="h-10 w-10">
                        {avatar_src && <AvatarImage src={avatar_src} />}
                        <AvatarFallback className={`font-semibold ${getAvatarColor(title)}`}>
                            {title.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>

                    <CardAction className="flex items-start justify-end gap-1">

                        {variant === "compact" && created_at && (
                            <Badge className="bg-sky-100 text-sky-700 flex items-center gap-1 text-xs mr-2">
                                <CalendarCheck size={12} /> {formattedDate}
                            </Badge>
                        )}

                        {status && (
                            <Badge className={`${statusStyles[status]} py-1 px-2`}>
                                {statusLabel[status]}
                            </Badge>
                        )}

                        {variant === "default" && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="-mt-1 -mr-1">
                                        <MoreVertical className="size-5" />
                                    </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align="end" className="rounded-lg">

                                    <DropdownMenuGroup>

                                        <DropdownMenuItem
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                setEditOpen(true)
                                            }}
                                            className="text-xs"
                                        >
                                            <PencilIcon />
                                            Edit
                                        </DropdownMenuItem>

                                        <DropdownMenuItem
                                            onClick={onShare}
                                            className="text-xs"
                                        >
                                            <Share2 />
                                            Share
                                        </DropdownMenuItem>

                                        <DropdownMenuItem
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                setDeleteOpen(true)
                                            }}
                                            className="text-xs!"
                                        >
                                            <TrashIcon />
                                            Delete
                                        </DropdownMenuItem>

                                    </DropdownMenuGroup>

                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                    </CardAction>
                </CardHeader>

                <CardContent className="mb-5">

                    <div className="space-y-1">

                        <h3 className="font-medium text-sm truncate">
                            {title}
                        </h3>

                        {templateTitle && (
                            <p className="text-xs text-muted-foreground truncate">
                                {templateTitle}
                            </p>
                        )}

                        {variant === "default" && teams.length > 0 && (
                            <p className="text-xs text-muted-foreground truncate">
                                {teams.map((t) => t.name).join(", ")}
                            </p>
                        )}

                    </div>

                </CardContent>

                {variant === "default" && (
                    <CardFooter className="border-t py-4 text-xs text-muted-foreground flex items-center justify-between">

                        {created_at && (
                            <span className="flex items-center gap-1">
                                <CalendarCheck size={16} className="text-black" />
                                <strong className="font-medium text-black">
                                    {formattedDate}
                                </strong>
                            </span>
                        )}

                        <AvatarGroup>

                            {visibleMembers.map((member) => (
                                <Avatar key={member.id} size="sm">
                                    <AvatarImage src={member.avatar_src || ""} alt={member.name} />
                                    <AvatarFallback className={`font-bold ${getAvatarColor(String(member.id))}`}>
                                        {member.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            ))}

                            {remainingCount > 0 && (
                                <AvatarGroupCount className="bg-black text-white text-xs">
                                    +{remainingCount}
                                </AvatarGroupCount>
                            )}

                        </AvatarGroup>

                    </CardFooter>
                )}

            </Card>
            </Link>

            <ProjectDialog
                mode="edit"
                project={{
                    id,
                    title,
                    slug,
                    template_id: template_id ?? "",
                    avatar_src: avatar_src ?? ""
                }}
                open={editOpen}
                onClose={() => setEditOpen(false)}
                onSaved={(updatedProject) => {
                    setEditOpen(false)
                    onEdit?.(updatedProject)
                }}
            />

            <ProjectActions
                project={project}
                editOpen={editOpen}
                setEditOpen={setEditOpen}
                deleteOpen={deleteOpen}
                setDeleteOpen={setDeleteOpen}
                onEdit={onEdit}
                onDelete={onDelete}
            />

        </>
    )
}