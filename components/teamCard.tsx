"use client"

import { Card, CardAction, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarCheck, FolderDot, FolderOpenDot, MoreVertical, Pencil, PencilIcon, Trash2, TrashIcon } from "lucide-react"

import type { Team } from "@/types/team"
import templatesData from "@/src/mocks/data/templates.json"
import { getIconColor } from "@/lib/get-icon-colors"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"

import { getAvatarColor } from "@/lib/get-avatar-colors"
import Link from "next/link"

type Props = {
    team: Team
    index: number
    slug: string
    projectsAssigned?: number
    onEdit?: (id: number) => void
    onDelete?: (id: number) => void
}

export default function TeamCard({
    team,
    slug,
    index,
    projectsAssigned,
    onEdit,
    onDelete,
}: Props) {
    const templateList = templatesData.templates
    const template = templateList.find(
        (t) => t.id === team.template
    )

    const allMembers = [
  ...(team.lead ? [team.lead] : []),
  ...(team.members || []),
]

    const visibleMembers = allMembers.slice(0, 3)
    const remainingCount = allMembers.length - visibleMembers.length

    return (
         <Link href={`/teams/${slug}`} key={slug} className="block">
        <Card className="mx-auto w-full p-0 gap-2 shadow-none rounded-2xl bg-gradient-violet transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">

            {/* Header */}
            <CardHeader className="p-5 pb-0">

                <span className="flex items-center gap-1 justify-start">
                    <CalendarCheck size={16} className="text-black" />
                    <strong className="font-medium text-black mt-0.5 text-xs">
                        {team.createdAt}
                    </strong>
                </span>

                <CardAction className="flex items-start justify-end gap-1">
                    {template && (
                        <Badge
                            variant="secondary"
                            className={`text-xs ${getIconColor(index)}`}
                        >
                            {template.title}
                        </Badge>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="-mt-1 -mr-1">
                                <MoreVertical className="size-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-lg">
                            <DropdownMenuGroup>
                                <DropdownMenuItem onClick={() => onEdit?.(team.id)} className="text-xs!">
                                    <PencilIcon />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onDelete?.(team.id)} variant="destructive" className="text-xs!">
                                    <TrashIcon />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardAction>
            </CardHeader>

            {/* Content */}
            <CardContent className="mb-5 mt-3">
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
            <CardFooter className="border-t py-4! text-xs text-muted-foreground flex items-center justify-between">
                {/* Members */}
                    <span className="flex items-center gap-1 justify-start">
                        <FolderOpenDot size={16} className="text-black" />
                        <strong className="font-medium text-black mt-0.5 text-xs">
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
                                    className={`font-bold ${getAvatarColor(String(member.id))}`}
                                >
                                    {member.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        ))}

                        {remainingCount > 0 && (
                            <AvatarGroupCount className="bg-black text-white text-xs">
                                +{remainingCount}
                            </AvatarGroupCount>
                        )}
                    </AvatarGroup> : "No members found" }
            </CardFooter>
        </Card>
        </Link>
    )
}