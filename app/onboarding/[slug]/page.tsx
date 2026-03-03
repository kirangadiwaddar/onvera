"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import type { Project } from "@/types/project"
import { templateStructure } from "@/lib/template-structure"
import ChecklistSection from "@/components/checklist-section"
import { Accordion } from "@/components/ui/accordion"
import { Progress } from "@/components/ui/progress"
import Logo from "@/components/ui/logo"

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar"
import { getAvatarColor } from "@/lib/get-avatar-colors"
import { Button } from "@/components/ui/button"
import { BadgeCheck, Check, Files } from "lucide-react"
import { EmptyState } from "@/components/emptyState"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { LoadingState } from "@/components/loadingState"

export default function ClientOnboardingPage() {
  const { slug } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return

    fetch(`/api/projects/${slug}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setProject(data.project)
        setLoading(false)
      })
  }, [slug])

  if (loading)
    return (
  <div className="min-h-screen flex items-center justify-center">
      <LoadingState title="Project Loading" description="Please wait We're fetching the project" />
      </div>
    )

  if (!project)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Project not found
      </div>
    )

  const sections = templateStructure[project.templateId] || []

  const totalSections = sections.length
  const completed = Object.keys(project.submissions || {}).length
  const progress = Math.min(
    Math.round((completed / totalSections) * 100),
    100
  )

  const members = project.members || []

  const visibleMembers = members.slice(0, 3)
  const remainingCount = members.length > 3 ? members.length - 3 : 0

  return (
    <div className="min-h-screen bg-zinc-50">

      {/* Header */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          {/* Logo */}
          <div className="text-xl flex items-center gap-2 font-semibold">
            <Logo width={30} /> Onvera
          </div>

          {/* Team Info */}
          {/* <div className="text-sm text-muted-foreground">
            Team Members: {project.members?.length || 1}
          </div> */}
          {members.length > 0 ? (
          <div className="flex items-center gap-2 bg-violet-100 rounded-full border-zinc-200 border p-2 pl-3">
            <p className="text-sm text-violet-900 font-medium">Team Members </p>
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
                  {member.name.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}

            {remainingCount > 0 && (
              <AvatarGroupCount className="bg-violet-700 text-white text-xs">
                +{remainingCount}
              </AvatarGroupCount>
            )}
          </AvatarGroup>
          </div>  
          ) : (
            <div className="flex items-center gap-2 bg-violet-100 rounded-full border-zinc-200 border p-2 pl-3 text-sm text-violet-900 font-medium">
              No team members added yet.
            </div>
          )}        
        </div>
      </header>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto px-6 sm:grid sm:grid-cols-3 gap-10 min-h-[calc(100dvh-85px)]">

        {/* LEFT 60% */}
        <div className="left-block col-span-2 space-y-8 border-r border-zinc-200 py-10 pr-10 h-full">

          {/* Project Title */}
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold">
              {project.title}
            </h1>
            <p className="text-muted-foreground">
              Please complete the details below.
            </p>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>

          {/* Sections */}
          <Accordion type="multiple" className="border border-zinc-200 rounded-lg overflow-hidden">
            {sections.map((section) => (
              <ChecklistSection
                key={section.id}
                section={section}
                isAgency={false}
                submissions={project.submissions || {}}
              />
            ))}
          </Accordion>

          <Button variant="gradient" size="lg" className="w-full text-lg py-6">
            Save Progress
          </Button>

        </div>

        {/* RIGHT 40% */}
        <div className="right-block space-y-10 py-10">

          {/* Uploaded Files */}
          {Object.keys(project.submissions || {}).length === 0 ? (
            <EmptyState icon={<Files />} title="No Files Uploaded" description="Client onboarding is pending" />
          ) :
            <div className="space-y-4">
              <h2 className="text-primary font-medium text-sm mb-6">
                Uploaded Files
              </h2>


              <div className="flex items-center gap-3 flex-wrap">
                {Object.entries(project.submissions || {}).map(([key]) => (
                  <div
                    key={key}
                    className="py-2 px-3 text-sm capitalize font-normal bg-violet-50 border border-violet-200 rounded-full flex items-center gap-2"
                  >
                    {key} <BadgeCheck className="size-5" fill="#00c951" stroke="#fff" />
                  </div>
                ))}
              </div>
            </div>
          }

          <Separator />

          {/* Timeline */}
          <div className="space-y-4">
            <h2 className="text-primary font-medium text-sm mb-6">
              Activity Timeline
            </h2>

            <div className="border border-zinc-200 rounded-lg space-y-3 text-sm">
              <div className="flex justify-between items-center text-sm border-b p-2.5 last:border-b-0">
                <p className="font-medium text-xs">Project Created</p>
                <Badge className="bg-violet-100 text-violet-600 py-1 px-3">
                  {new Date(project.createdAt).toLocaleDateString()}
                </Badge>
              </div>
              {project.updatedAt && (
              <div className="flex justify-between items-center text-sm border-b p-2.5 pt-0 last:border-b-0">
                <p className="font-medium text-xs">Last Updated</p>
                <Badge className="bg-violet-100 text-violet-600 py-1 px-3">
                  {new Date(project.updatedAt).toLocaleDateString()}
                </Badge>
              </div>)}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}