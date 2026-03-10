"use client"

import { useEffect, useMemo, useState } from "react"
import { FolderOpenDot, ListFilter, Plus } from "lucide-react"

import { ProjectCard } from "@/components/project-card"
import { ProjectModal, type ProjectFormValues } from "@/components/projects/project-modal"
import { DeleteProjectAlert } from "@/components/projects/delete-project-alert"
import { EmptyState } from "@/components/emptyState"
import { LoadingState } from "@/components/loadingState"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Separator } from "@/components/ui/separator"
import type { status } from "@/lib/project-status"
import { useAuth } from "@/components/providers/auth-provider"
import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { toast } from "sonner"

const statuses: Array<{ value: "all" | status; label: string }> = [
  { value: "all", label: "All" },
  { value: "ongoing", label: "Ongoing" },
  { value: "onhold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
  { value: "waiting", label: "Waiting" },
]

type TemplateOption = {
  id: string
  title: string
}

type ProjectItem = {
  id: number
  slug: string
  title: string
  templateId: string
  templateTitle?: string
  status: status
  avatarSrc?: string
  createdAt?: string
  members?: { id: number; name: string; image?: string }[]
}

export default function Page() {
  const { profile } = useAuth()
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<"all" | status>("all")
  const [templateFilter, setTemplateFilter] = useState<string[]>(["all"])

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null)
  const [deletingProject, setDeletingProject] = useState<ProjectItem | null>(null)
  const isReadOnlyRole = profile?.role === "project_member" || profile?.role === "team_member"

  const loadProjects = async () => {
    let res = await fetchWithAuth("/api/projects", { cache: "no-store" })
    if (res.status === 401) {
      await new Promise((resolve) => setTimeout(resolve, 300))
      res = await fetchWithAuth("/api/projects", { cache: "no-store" })
    }
    if (!res.ok) {
      if (res.status === 401) {
        setProjects([])
        return
      }
      throw new Error("Failed to load projects")
    }
    const data = await res.json()
    setProjects(Array.isArray(data?.projects) ? data.projects : [])
  }

  const loadTemplates = async () => {
    const res = await fetchWithAuth("/api/templates", { cache: "no-store" })
    if (!res.ok) throw new Error("Failed to load templates")
    const data = await res.json()

    const nextTemplates: TemplateOption[] = Array.isArray(data?.templates)
      ? data.templates.map((item: { id: string; title: string }) => ({
          id: item.id,
          title: item.title,
        }))
      : []

    setTemplates(nextTemplates)
  }

  useEffect(() => {
    const loadInitial = async () => {
      try {
        await Promise.all([loadProjects(), loadTemplates()])
      } catch (error) {
        console.error("Failed to initialize projects page:", error)
      } finally {
        setLoading(false)
      }
    }

    void loadInitial()
  }, [])

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const statusMatch = statusFilter === "all" || project.status === statusFilter
      const templateMatch =
        templateFilter.includes("all") || templateFilter.includes(project.templateId)

      return statusMatch && templateMatch
    })
  }, [projects, statusFilter, templateFilter])

  const ITEMS_PER_PAGE = 9
  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const projectsToShow = filteredProjects.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, templateFilter])

  const toggleOption = (value: string) => {
    if (value === "all") {
      setTemplateFilter(["all"])
      return
    }

    setTemplateFilter((prev) => {
      const withoutAll = prev.filter((v) => v !== "all")
      const updated = withoutAll.includes(value)
        ? withoutAll.filter((v) => v !== value)
        : [...withoutAll, value]

      return updated.length === 0 ? ["all"] : updated
    })
  }

  const activeTemplateCount = templateFilter.includes("all") ? 0 : templateFilter.length
  const isStatusActive = statusFilter !== "all"

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
        const payload = await res.json().catch(() => null) as { message?: string } | null
        throw new Error(payload?.message || "Failed to create project")
      }

      await loadProjects()
      setIsCreateOpen(false)
      toast.success("Project created")
    } catch (error) {
      console.error("Create project failed:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create project")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditProject = async (values: ProjectFormValues) => {
    if (!editingProject) return

    setSubmitting(true)
    try {
      const res = await fetchWithAuth(`/api/projects/${editingProject.slug}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: values.title,
          avatarSrc: values.avatarSrc,
          templateId: values.templateId,
          status: editingProject.status,
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { message?: string } | null
        throw new Error(payload?.message || "Failed to update project")
      }

      await loadProjects()
      setEditingProject(null)
      toast.success("Project updated")
    } catch (error) {
      console.error("Update project failed:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update project")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!deletingProject) return

    setSubmitting(true)
    try {
      const res = await fetchWithAuth(`/api/projects/${deletingProject.slug}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { message?: string } | null
        throw new Error(payload?.message || "Failed to delete project")
      }

      await loadProjects()
      setDeletingProject(null)
      toast.success("Project deleted")
    } catch (error) {
      console.error("Delete project failed:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete project")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <LoadingState
        title="Loading Projects..."
        description="Fetching your projects, please wait."
      />
    )
  }

  return (
    <>
      {projects.length === 0 ? (
        <EmptyState
          title="No Projects Yet"
          description="You haven't created any projects yet."
          buttonText={isReadOnlyRole ? undefined : "Create Project"}
          onClick={isReadOnlyRole ? undefined : () => setIsCreateOpen(true)}
          icon={<FolderOpenDot />}
        />
      ) : (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="flex flex-col lg:flex-row items-center justify-between px-7 gap-4 lg:gap-5">
            <p className="text-sm flex-1 lg:line-clamp-2">
              Manage and track all your projects, monitor progress, and stay on top of deadlines in one place.
            </p>
            <div className="right-actions flex items-center gap-3 justify-end">
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
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
                      <DropdownMenuCheckboxItem
                        checked={templateFilter.includes("all")}
                        onCheckedChange={() => toggleOption("all")}
                      >
                        All
                      </DropdownMenuCheckboxItem>
                      {templates.map((item) => (
                        <DropdownMenuCheckboxItem
                          key={item.id}
                          checked={templateFilter.includes(item.id)}
                          onCheckedChange={() => toggleOption(item.id)}
                        >
                          {item.title}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

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
                    <DropdownMenuRadioGroup value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | status)}>
                      {statuses.map((item) => (
                        <DropdownMenuRadioItem key={item.value} value={item.value}>
                          {item.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {!isReadOnlyRole && (
                <Button variant="gradient" onClick={() => setIsCreateOpen(true)}>
                  <Plus strokeWidth={2} /> Create New
                </Button>
              )}
            </div>
          </div>

          <Separator className="my-0 bg-border" />

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-7 pb-0 pt-0">
            {projectsToShow.map((project) => (
              <ProjectCard
                key={project.id}
                id={project.id}
                slug={project.slug}
                title={project.title}
                templateTitle={project.templateTitle}
                status={project.status}
                createdAt={project.createdAt}
                avatarSrc={project.avatarSrc}
                members={project.members}
                onEdit={isReadOnlyRole ? undefined : () => setEditingProject(project)}
                onDelete={isReadOnlyRole ? undefined : () => setDeletingProject(project)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}

      {!isReadOnlyRole && isCreateOpen ? (
        <ProjectModal
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          mode="create"
          templates={templates}
          loading={submitting}
          onSubmit={handleCreateProject}
        />
      ) : null}

      {!isReadOnlyRole && editingProject ? (
        <ProjectModal
          open={!!editingProject}
          onOpenChange={(open) => {
            if (!open) setEditingProject(null)
          }}
          mode="edit"
          templates={templates}
          loading={submitting}
          initialValues={{
            title: editingProject.title,
            avatarSrc: editingProject.avatarSrc ?? "",
            templateId: editingProject.templateId,
          }}
          onSubmit={handleEditProject}
        />
      ) : null}

      {!isReadOnlyRole && <DeleteProjectAlert
        open={!!deletingProject}
        onOpenChange={(open) => {
          if (!open) setDeletingProject(null)
        }}
        projectTitle={deletingProject?.title}
        loading={submitting}
        onConfirm={handleDeleteProject}
      />}
    </>
  )
}
