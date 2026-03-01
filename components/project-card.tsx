"use client"

import {
    Calendar,
    CalendarCheck,
    MoreVertical,
    PencilIcon,
    Share2,
    TrashIcon,
} from "lucide-react"
import Link from "next/link"

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
    DropdownMenuSeparator,
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
import { on } from "events"
import { getAvatarColor } from "@/lib/get-avatar-colors"
import { status } from "@/lib/project-status"

// type status = "completed" | "overdue" | "waiting" | "ongoing" | "onhold"


export interface ProjectCardProps {
    id: number,
    slug: string,
    title: string
    templateTitle?: string
    status?: status
    avatarSrc?: string
    createdAt?: string
    onEdit?: () => void
    onDelete?: () => void
    onShare?: () => void
    teams?: {
        id: number
        name: string
    }[]

    members?: {
        id: number
        name: string
        image?: string
    }[]
    variant?: "default" | "compact"
}



export function ProjectCard({
    id,
    slug,
    title,
    templateTitle,
    status,
    avatarSrc,
    createdAt,
    teams = [],
    members = [],
    onEdit,
    onDelete,
    onShare,
    variant = "default",
}: ProjectCardProps) {


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
        createdAt &&
        new Date(createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        })

    const MAX_VISIBLE = 3
    const visibleMembers = members.slice(0, MAX_VISIBLE)
    const remainingCount = members.length - MAX_VISIBLE


    return (
        <Link href={`/projects/${slug}`} key={slug} className="block">
            <Card className="mx-auto w-full p-0 gap-2 shadow-none bg-gradient-violet rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <CardHeader className="p-5 pb-0">
                    <Avatar className="h-10 w-10">
                        {avatarSrc && <AvatarImage src={avatarSrc} />}
                        <AvatarFallback className={`font-semibold ${getAvatarColor(title)}`}>
                            {title.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>

                    <CardAction className="flex items-start justify-end gap-1">
                        {variant === "compact" && createdAt && (
                            <Badge className="bg-white border border-zinc-100 flex items-center gap-1 justify-start text-[10px] mr-2">
                                <CalendarCheck size={12} className="text-black" />
                                <strong className="font-light text-muted-foreground mt-0.5">
                                    {formattedDate}
                                </strong>
                            </Badge>
                        )}
                        {status && (
                            <Badge className={`${statusStyles[status]}`}>
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
                                        <DropdownMenuItem onClick={onEdit} className="text-xs!">
                                            <PencilIcon />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={onShare} className="text-xs!">
                                            <Share2 />
                                            Share
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={onDelete} variant="destructive" className="text-xs!">
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
                    <div className="flex gap-4 items-start min-w-0">
                        <div className="space-y-1 flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">
                                {title}
                            </h3>
                            {templateTitle && (
                                <p className="text-xs text-muted-foreground truncate">
                                    {templateTitle}
                                </p>
                            )}
                        </div>
                    </div>
                    

                    {variant === "default" && teams.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">
                            {teams.map(t => t.name).join(", ")}
                        </p>
                    )}
                </CardContent>

                {variant === "default" && (
                    <CardFooter className="border-t py-4! text-xs text-muted-foreground flex items-center justify-between">
                        {createdAt && (
                            <span className="flex items-center gap-1 justify-start">
                                <CalendarCheck size={16} className="text-black" />
                                <strong className="font-medium text-black mt-0.5">
                                    {formattedDate}
                                </strong>
                            </span>
                        )}


                        <AvatarGroup>
                            {visibleMembers.map((member) => (
                                <Avatar key={member.id} size="sm">
                                    <AvatarImage src={member.image} alt={member.name} />
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
    )
}