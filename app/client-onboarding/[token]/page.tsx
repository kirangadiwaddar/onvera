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
import { BadgeCheck, Files } from "lucide-react"

import { EmptyState } from "@/components/emptyState"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { LoadingState } from "@/components/loadingState"

export default function ClientOnboardingPage() {

  const params = useParams()

  const token =
    typeof params.token === "string"
      ? params.token
      : Array.isArray(params.token)
      ? params.token[0]
      : ""

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  const [authorized, setAuthorized] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [passwordError, setPasswordError] = useState("")

  const checklistRole = "client"

  /* ---------------- FETCH PROJECT ---------------- */

  useEffect(() => {

    if (!token) {
      setLoading(false)
      return
    }

    const fetchProject = async () => {

      try {

        const res = await fetch(`/api/client-onboarding/${token}`, {
          cache: "no-store"
        })

        const data = await res.json()

        if (!res.ok) {
          console.error("Client onboarding fetch failed:", data)
          setProject(null)
          return
        }

        await fetch("/api/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: data.id,
            title: "Client opened onboarding",
            status: "success",
            owner_id: data.owner_id
          })
        })

        setProject(data)

        if (!data.client_password) {
          setAuthorized(true)
        }

      } catch (err) {

        console.error("Client onboarding error:", err)
        setProject(null)

      } finally {

        setLoading(false)

      }

    }

    fetchProject()

  }, [token])

  /* ---------------- PASSWORD VERIFY ---------------- */

  const verifyPassword = () => {

    if (!project) return

    if (passwordInput === project.client_password) {

      setAuthorized(true)
      setPasswordError("")

    } else {

      setPasswordError("Incorrect password")

    }

  }

  /* ---------------- LOADING ---------------- */

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState
          title="Project Loading"
          description="Please wait We're fetching the project"
        />
      </div>
    )

  if (!project)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Project not found
      </div>
    )

  /* ---------------- PASSWORD SCREEN ---------------- */

  if (!authorized && project.client_password) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-zinc-50">

        <div className="bg-white border rounded-xl p-8 w-[360px] space-y-4">

          <div className="text-center space-y-2">

            <Logo width={40} />

            <h2 className="text-lg font-semibold">
              Client Access
            </h2>

            <p className="text-sm text-muted-foreground">
              Enter password to access onboarding
            </p>

          </div>

          <input
            type="password"
            placeholder="Enter password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />

          {passwordError && (
            <p className="text-red-500 text-sm">
              {passwordError}
            </p>
          )}

          <Button
            className="w-full"
            onClick={verifyPassword}
          >
            Continue
          </Button>

        </div>

      </div>

    )

  }

  /* ---------------- SECTIONS ---------------- */

  const templateSections = templateStructure[project.template_id] || []
const customSections = project.custom_sections || []

const sections = [...templateSections, ...customSections]

  const totalSections = sections.length
  const completed = Object.keys(project.submissions || {}).length

  const progress = Math.min(
    Math.round((completed / totalSections) * 100),
    100
  )

  const members = project.members || []

  const visibleMembers = members.slice(0, 3)
  const remainingCount =
    members.length > 3 ? members.length - 3 : 0

  /* ---------------- MAIN UI ---------------- */

  return (

    <div className="min-h-screen bg-zinc-50">

      {/* HEADER */}

      <header className="border-b border-zinc-200 bg-white">

        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

          <div className="text-xl flex items-center gap-2 font-semibold">
            <Logo width={30} /> Onvera
          </div>

          {members.length > 0 ? (

            <div className="flex items-center gap-2 bg-violet-50 rounded-full border-violet-100 border p-2 pl-3">

              <p className="text-sm text-violet-900 font-medium">
                Team Members
              </p>

              <AvatarGroup>

                {project.teams?.map((team) => (
                  <Avatar key={`team-${team.id}`} size="sm">
                    <AvatarFallback
                      className={`font-bold ${getAvatarColor(String(team.id))}`}
                    >
                      {team.name.slice(0,1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}

                {visibleMembers.map((member) => (

                  <Avatar key={member.id} size="sm">

                    <AvatarImage
                      src={member.avatar_src || ""}
                      alt={member.name}
                    />

                    <AvatarFallback
                      className={`font-bold ${getAvatarColor(String(member.id))}`}
                    >
                      {member.name.slice(0,1).toUpperCase()}
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

      {/* MAIN */}

      <div className="max-w-7xl mx-auto px-6 sm:grid sm:grid-cols-3 gap-10 min-h-[calc(100dvh-85px)]">

        {/* LEFT */}

        <div className="col-span-2 space-y-8 border-r border-zinc-200 py-10 pr-10">

          <div className="space-y-2">

            <h1 className="text-3xl font-semibold">
              {project.title}
            </h1>

            <p className="text-muted-foreground">
              Please complete the details below.
            </p>

          </div>

          <div className="space-y-2">

            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>

            <Progress value={progress} />

          </div>

          <Accordion
            type="multiple"
            className="border border-zinc-200 rounded-lg overflow-hidden"
          >

            {sections.map((section) => (

              <ChecklistSection
                key={section.id}
                section={section}
                permission={checklistRole}
                submissions={project.submissions}
                projectId={project.id}
              />

            ))}

          </Accordion>

          <Button
            variant="gradient"
            size="lg"
            className="w-full text-lg py-6"
          >
            Save Progress
          </Button>

        </div>

        {/* RIGHT */}

        <div className="space-y-10 py-10">

          {Object.keys(project.submissions || {}).length === 0 ? (

            <EmptyState
              icon={<Files />}
              title="No Files Uploaded"
              description="Client onboarding is pending"
            />

          ) : (

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

                    {key}

                    <BadgeCheck
                      className="size-5"
                      fill="#00c951"
                      stroke="#fff"
                    />

                  </div>

                ))}

              </div>

            </div>

          )}

          <Separator />

          <div className="space-y-4">

            <h2 className="text-primary font-medium text-sm mb-6">
              Activity Timeline
            </h2>

            <div className="border border-zinc-200 rounded-lg space-y-3 text-sm">

              <div className="flex justify-between items-center text-sm border-b p-2.5">

                <p className="font-medium text-xs">
                  Project Created
                </p>

                <Badge className="bg-violet-100 text-violet-600 py-1 px-3">
                  {new Date(project.created_at).toLocaleDateString()}
                </Badge>

              </div>

              {project.updated_at && (

                <div className="flex justify-between items-center text-sm p-2.5">

                  <p className="font-medium text-xs">
                    Last Updated
                  </p>

                  <Badge className="bg-violet-100 text-violet-600 py-1 px-3">
                    {new Date(project.updated_at).toLocaleDateString()}
                  </Badge>

                </div>

              )}

            </div>

          </div>

        </div>

      </div>

    </div>

  )

}