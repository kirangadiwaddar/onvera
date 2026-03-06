"use client"
import { useState, useEffect, useMemo } from "react"
import { ProjectCard } from "@/components/project-card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ListFilter, Plus } from "lucide-react"
import { LoadingState } from "@/components/loadingState"
import { Project } from "@/types/project"
// import { CreateProjectDialog } from "@/components/project-dialog"

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/emptyState"
import { FolderOpenDot } from "lucide-react"
import Link from "next/link"

import { getTemplateMap } from "@/lib/templateUtils";
import { ProjectDialog } from "@/components/project-dialog"
import { DeleteProjectDialog } from "@/components/delete-project-dialog"


const statuses = [
  { value: "all", label: "All" },
  { value: "ongoing", label: "Ongoing" },
  { value: "onhold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
  { value: "waiting", label: "Waiting" },
]

// const templateOptions = [
//   "All",
//   "Web Development",
//   "UI/UX Experience",
//   "App Development",
//   "SaaS Platform",
//   "E-Commerce",
//   "Digital Marketing",
//   "Branding",
// ]

const templateOptions = [
  { label: "All", value: "all" },
  { label: "Web Development", value: "web-development" },
  { label: "UI/UX Experience", value: "ui/ux-experience" },
  { label: "App Development", value: "app-development" },
  { label: "SaaS Platform", value: "saas-platform" },
  { label: "E-Commerce", value: "ecommerce" },
  { label: "Digital Marketing", value: "digital-marketing" },
  { label: "Branding", value: "branding" },
]


export default function Page() {

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const [currentPage, setCurrentPage] = useState(1)
  const [status, setStatus] = useState("all")
  const [template, setTemplate] = useState<string[]>(["all"])
  const [templatesList, setTemplatesList] = useState<any[]>([])

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [open, setOpen] = useState(false)

  // useEffect(() => {
  //   fetch('/api/projects', { cache: 'no-store' })
  //     .then(res => res.json())
  //     .then(data => {
  //       setProjects(data.projects)
  //       setLoading(false)
  //     })
  // }, [])

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch("/api/projects", {
          cache: "no-store",
        })

        if (!res.ok) {
          const err = await res.json()
          console.error("Projects fetch failed:", err)
          setProjects([])
          return
        }

        const data = await res.json()

        setProjects(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error("Fetch projects error:", error)
        setProjects([])
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch("/api/templates", {
          cache: "no-store",
        })

        if (!res.ok) return

        const data = await res.json()
        setTemplatesList(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error("Template fetch failed:", err)
      }
    }

    fetchTemplates()
  }, [])

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {

      const statusMatch =
        status === "all" || project.status === status

      const templateMatch =
        template.includes("all") ||
        template.includes(project.template_id)

      return statusMatch && templateMatch
    })
  }, [projects, status, template])

  const ITEMS_PER_PAGE = 9
  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const projectsToShow = filteredProjects.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [status, template])

  if (loading) return (<LoadingState
    title="Loading Projects..."
    description="Fetching your projects, please wait."
  />)
  if (projects.length === 0) return <>
    <EmptyState
      icon={<FolderOpenDot />}
      title="No Projects "
      description="You have no projects created"
      action={<ProjectDialog
        mode="create"
        onSaved={(project) => {
          setProjects((prev) => [project, ...prev])
        }}
      />}
    />
  </>

  const toggleOption = (value: string) => {
    if (value === "all") {
      setTemplate(["all"])
      return
    }

    setTemplate((prev) => {
      const withoutAll = prev.filter((v) => v !== "all")

      const updated = withoutAll.includes(value)
        ? withoutAll.filter((v) => v !== value)
        : [...withoutAll, value]

      return updated.length === 0 ? ["all"] : updated
    })
  }

  const activeTemplateCount =
    template.includes("all") ? 0 : template.length

  const isStatusActive = status !== "all"

  const totalActiveFilters =
    activeTemplateCount + (isStatusActive ? 1 : 0)

  const templateMap = templatesList.reduce(
    (acc: Record<string, string>, t) => {
      acc[t.id] = t.title
      return acc
    },
    {}
  )

  const handleProjectUpdated = (updatedProject: Project | null) => {
    if (!updatedProject) return

    setProjects((prev) =>
      prev.map((p) =>
        p.id === updatedProject.id ? updatedProject : p
      )
    )
  }

  const handleProjectDeleted = (id: number) => {
    setProjects((prev) =>
      prev.filter((p) => p.id !== id)
    )
  }
  const handleProjectCreated = (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev])
  }

  return (
    <>
      {projects.length === 0 ? (
        <EmptyState
          title="No Projects Yet"
          description="You haven't created any projects yet."
          buttonText="Create Project"
          onClick={() => console.log("Create")}
          icon={<FolderOpenDot />}
        />
      ) : (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="flex flex-col lg:flex-row items-center justify-between px-7 gap-4 lg:gap-5">
            <p className="text-sm flex-1 lg:line-clamp-2">Manage and track all your projects, monitor progress, and stay on top of deadlines in one place.</p>
            <div className="right-actions flex items-center gap-3 justify-end">
              <div className="flex items-center border border-gray-300 rounded-full overflow-hidden">
                {/* Template Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="rounded-r-none border-0 gap-2 text-xs"
                    >
                      <ListFilter className="w-3 h-3" />
                      Template
                      {activeTemplateCount > 0 && (
                        <span className="ml-1 bg-violet-500 w-4 h-4 text-white text-[10px] leading-4 rounded-full">
                          {activeTemplateCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuGroup>
                      {templateOptions.map((item) => (
                        <DropdownMenuCheckboxItem
                          key={item.value}
                          checked={template.includes(item.value)}
                          onCheckedChange={() => toggleOption(item.value)}
                        >
                          {item.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Status Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="rounded-l-none border-0 border-l border-gray-300 gap-2 text-xs"
                    >
                      <ListFilter className="w-3 h-3" />
                      Status
                      {isStatusActive && (
                        <span className="ml-1 bg-violet-500 w-4 h-4 text-white text-[10px] leading-4 rounded-full">
                          1
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuRadioGroup value={status} onValueChange={setStatus}>
                      {statuses.map((item) => (
                        <DropdownMenuRadioItem key={item.value} value={item.value}>
                          {item.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {/* <Button variant="gradient"> Create New</Button> */}
              <ProjectDialog mode="create"
                onSaved={(project) => {
                  setProjects((prev) => [project, ...prev])
                }} />
            </div>
          </div>

          <Separator className="my-0 bg-gray-100" />

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-7 pb-0 pt-0">
            {projectsToShow.map((project: any) => (
              <ProjectCard
                key={project.id}
                id={project.id}
                slug={project.slug}
                title={project.title}
                templateTitle={templateMap[project.template_id]}
                status={project.status}
                created_at={project.created_at}
                avatar_src={project.avatar_src}
                members={project.members}
                project={{
                  ...project,
                  templateTitle: templateMap[project.template_id],
                }}
                onEdit={handleProjectUpdated}
                onDelete={handleProjectDeleted}
              />
            ))}
          </div>

          {projects.length > ITEMS_PER_PAGE && (
            <Pagination className="mt-8">
              <PaginationContent>

                <PaginationItem>
                  <PaginationPrevious
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                  />
                </PaginationItem>

                {[...Array(totalPages)].map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      isActive={currentPage === i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(prev + 1, totalPages)
                      )
                    }
                  />
                </PaginationItem>

              </PaginationContent>
            </Pagination>
          )}

        </div>
      )}
    </>
  )
}


