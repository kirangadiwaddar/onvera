"use client"

import { useEffect, useState } from "react"
import { Card, CardAction, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarCheck, FolderOpenDot, MoreVertical, PencilIcon, TrashIcon } from "lucide-react"

import type { Team } from "@/types/team"
import { getIconColor } from "@/lib/get-icon-colors"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { getAvatarColor } from "@/lib/get-avatar-colors"
import Link from "next/link"

type Template = {
  id: string
  title: string
}

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
  const [templates, setTemplates] = useState<Template[]>([])

  // 🔥 Fetch real templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch("/api/templates", {
          cache: "no-store",
        })

        if (!res.ok) return

        const data = await res.json()
        setTemplates(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error("Template fetch error:", err)
      }
    }

    fetchTemplates()
  }, [])

  // Build template map
  const templateMap = templates.reduce((acc, t) => {
    acc[t.id] = t.title
    return acc
  }, {} as Record<string, string>)

  const lead = team.members?.find(m => m.is_lead)
  const regularMembers = team.members?.filter(m => !m.is_lead) || []

  const allMembers = [
    ...(lead ? [lead] : []),
    ...regularMembers
  ]

  const visibleMembers = allMembers.slice(0, 3)
  const remainingCount = allMembers.length - visibleMembers.length

  return (
    
      <Card className="mx-auto w-full p-0 gap-2 shadow-none rounded-2xl bg-gradient-violet transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">

        {/* Header */}
        <CardHeader className="p-5 pb-0">
          <span className="flex items-center gap-1">
            <CalendarCheck size={16} className="text-black" />
            <strong className="font-medium text-black mt-0.5 text-xs">
              {new Date(team.created_at).toLocaleDateString("en-GB")}
            </strong>
          </span>

          <CardAction className="flex items-start justify-end gap-1">

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="-mt-1 -mr-1">
                  <MoreVertical className="size-5" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="rounded-lg">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onSelect={(e) =>{
                      e.preventDefault()
                      onEdit?.(team.id)
                    }}
                    className="text-xs!"
                  >
                    <PencilIcon />
                    Edit
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onDelete?.(team.id)
                    }}
                    variant="destructive"
                    className="text-xs!"
                  >
                    <TrashIcon />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </CardHeader>
        <Link href={`/teams/${slug}`} className="block">
        {/* Content */}
        <CardContent className="mb-5 mt-3">
          <h3 className="text-base font-medium mb-2">
            {team.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {team.description}
          </p>
        </CardContent>
        </Link>

        {/* Footer */}
        <CardFooter className="border-t py-4! text-xs text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-1">
            <FolderOpenDot size={16} className="text-black" />
            <strong className="font-medium text-black mt-0.5 text-xs">
              {projectsAssigned ?? 0} Projects Assigned
            </strong>
          </span>

          {allMembers.length > 0 ? (
            <AvatarGroup>
              {visibleMembers.map((member) => (
                <Avatar key={member.id} size="sm">
                  <AvatarImage src={member.avatar_src ?? undefined} alt={member.name} />
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
            </AvatarGroup>
          ) : (
            "No members found"
          )}
        </CardFooter>
      </Card>    
  )
}