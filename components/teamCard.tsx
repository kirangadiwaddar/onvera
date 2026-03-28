"use client"

import { Card, CardAction, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { CalendarCheck, FolderOpenDot, Lock, MoreVertical, PencilIcon, TrashIcon } from "lucide-react"

import type { Team } from "@/types/team"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"

import { getAvatarColor } from "@/lib/get-avatar-colors"
import Link from "next/link"

type Props = {
    team: Team
    slug: string
    projectsAssigned?: number
    isLocked?: boolean
    onEdit?: (team: Team) => void
    onDelete?: (team: Team) => void
}

export default function TeamCard({
    team,
    slug,
    projectsAssigned,
    isLocked,
    onEdit,
    onDelete,
}: Props) {
    const hasActions = Boolean(onEdit || onDelete)
    const allMembers = [
  ...(team.lead ? [team.lead] : []),
  ...(team.members || []),
]

    const visibleMembers = allMembers.slice(0, 3)
    const remainingCount = allMembers.length - visibleMembers.length
    const formattedCreatedAt = new Date(team.createdAt).toLocaleDateString("en-GB")

    return (
        <Card className="mx-auto w-full p-0 gap-2 shadow-none rounded-2xl bg-gradient-violet transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">

            {/* Header */}
            <CardHeader className="p-5 pb-0">

                <span className="flex items-center gap-1 justify-start">
                    <CalendarCheck size={16} className="text-foreground" />
                    <strong className="font-medium text-foreground mt-0.5 text-xs">
                        {formattedCreatedAt}
                    </strong>
                    <span className="mx-1 text-zinc-300 dark:text-white/20">|</span>
                    <span className="inline-flex items-center gap-1.5 text-xs capitalize text-zinc-700 dark:text-white/70">
                        <span
                            className={`h-2.5 w-2.5 rounded-full ${
                                team.status === "active" ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                        />
                        {team.status}
                    </span>
                    {isLocked ? (
                        <>
                            <span className="mx-1 text-zinc-300 dark:text-white/20">|</span>
                            <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-200">
                                <Lock className="size-3" />
                                Locked
                            </span>
                        </>
                    ) : null}
                </span>

                <CardAction className="flex items-start justify-end gap-1">
                    {hasActions ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="-mt-1 -mr-1"
                                    onClick={(event) => {
                                        event.preventDefault()
                                        event.stopPropagation()
                                    }}
                                >
                                    <MoreVertical className="size-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-lg">
                                <DropdownMenuGroup>
                                    {onEdit ? (
                                        <DropdownMenuItem
                                            onSelect={(event) => {
                                                event.preventDefault()
                                                event.stopPropagation()
                                                onEdit(team)
                                            }}
                                            className="text-xs!"
                                        >
                                            <PencilIcon />
                                            Edit
                                        </DropdownMenuItem>
                                    ) : null}
                                    {onDelete ? (
                                        <DropdownMenuItem
                                            onSelect={(event) => {
                                                event.preventDefault()
                                                event.stopPropagation()
                                                onDelete(team)
                                            }}
                                            variant="destructive"
                                            className="text-xs!"
                                        >
                                            <TrashIcon />
                                            Delete
                                        </DropdownMenuItem>
                                    ) : null}
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : null}
                </CardAction>
            </CardHeader>

            {/* Content */}
            <Link href={`/teams/${slug}`} className="block">
                <CardContent className="mb-5 mt-3 cursor-pointer">
                    <h3 className="text-base font-medium mb-2">
                        {team.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-4.5 min-w-0">{team.description}</p>

                    {/* Lead */}
                    {/* {team.lead && (
                    <div className="text-xs text-muted-foreground">
                        Lead: <span className="font-medium text-foreground">
                            {team.lead.name}
                        </span>
                    </div>
                )} */}
                </CardContent>
            </Link>
            <CardFooter className="border-t py-4! text-xs text-muted-foreground flex items-center justify-between">
                {/* Members */}
                    <span className="flex items-center gap-1 justify-start">
                        <FolderOpenDot size={16} className="text-foreground" />
                        <strong className="font-medium text-foreground mt-0.5 text-xs">
                            {projectsAssigned ?? 0} Projects Assigned
                        </strong>
                    </span>
                    {allMembers.length > 0 ? 
                    <AvatarGroup>
                        {visibleMembers.map((member) => (
                            <Avatar key={member.id} size="sm">
                                <AvatarImage
                                    src={member.image}
                                    alt={member.name}
                                />
                                <AvatarFallback
                                    className={`font-bold ${getAvatarColor(member.name || member.email || "M")}`}
                                >
                                    {member.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        ))}

                        {remainingCount > 0 && (
                            <AvatarGroupCount className="bg-zinc-900 text-white text-xs dark:bg-white/10 dark:text-white">
                                +{remainingCount}
                            </AvatarGroupCount>
                        )}
                    </AvatarGroup> : "No members found" }
            </CardFooter>
        </Card>
    )
}
