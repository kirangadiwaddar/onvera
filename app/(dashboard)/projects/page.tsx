"use client"

import { useEffect, useMemo, useState } from "react"
import { FolderOpenDot, LayoutGrid, List, ListFilter, Lock, MoreVertical, PencilIcon, Plus, TrashIcon } from "lucide-react"

import { ProjectCard } from "@/components/project-card"
import { ProjectModal, type ProjectFormValues } from "@/components/projects/project-modal"
import { DeleteProjectAlert } from "@/components/projects/delete-project-alert"
import { EmptyState } from "@/components/emptyState"
import { LoadingState } from "@/components/loadingState"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "@/components/ui/avatar"
import { getAvatarColor } from "@/lib/get-avatar-colors"
import type { status } from "@/lib/project-status"
import { statusLabel, statusStyles } from "@/lib/project-status"
import { useAuth } from "@/components/providers/auth-provider"
import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { toast } from "sonner"
import { getPlanLimits, normalizePlan } from "@/lib/billing/plans"

type WorkspaceItem = {
  id: string
  name: string
  email: string | null
  plan: string | null
  role: "super_admin" | "team_lead" | "team_member" | "project_member"
}

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
  createdBy?: string | null
}

function sortProjectsByNewest(items: ProjectItem[]) {
  return [...items].sort((a, b) => {
    const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return bDate - aDate
  })
}

export default function Page() {
  const { profile, user, loading: authLoading } = useAuth()
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<"all" | status>("all")
  const [templateFilter, setTemplateFilter] = useState<string[]>(["all"])
  const [projectsView, setProjectsView] = useState<"grid" | "table">("grid")
  const [is2xl, setIs2xl] = useState(false)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null)
  const [deletingProject, setDeletingProject] = useState<ProjectItem | null>(null)
  const ensureOwnerWorkspace = (items: WorkspaceItem[]): WorkspaceItem[] => {
    if (!user?.id) return items
    const ownsFlag =
      typeof window !== "undefined" && window.localStorage.getItem("onvera:ownsWorkspace") === "true"
    const ownsByProfile =
      profile?.role === "super_admin" ||
      (typeof user.user_metadata?.role === "string" && user.user_metadata.role === "super_admin")
    if (!(ownsFlag || ownsByProfile)) return items
    if (items.some((workspace) => workspace.id === user.id)) return items
    const fallbackName =
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Workspace"
    const ownerWorkspace: WorkspaceItem = {
      id: user.id,
      name: String(fallbackName),
      email: user.email || null,
      plan: typeof profile?.plan === "string" ? profile.plan : "free",
      role: "super_admin",
    }
    return [ownerWorkspace, ...items]
  }
  const currentWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId) || null
  const workspaceRole = currentWorkspace?.role || profile?.role || null
  const isReadOnlyRole =
    workspaceRole === "project_member" ||
    workspaceRole === "team_member" ||
    workspaceRole === "team_lead"
  const canManageProjects = workspaceRole === "super_admin"
  const currentPlan = normalizePlan(
    currentWorkspace?.plan || profile?.plan || (typeof user?.user_metadata?.plan === "string" ? user.user_metadata.plan : null),
  )
  const planLimits = getPlanLimits(currentPlan)
  const ownedProjectCount = projects.filter(
    (project) => !selectedWorkspaceId || project.createdBy === selectedWorkspaceId,
  ).length
  const projectLimitReached = planLimits.maxProjects !== null && ownedProjectCount >= planLimits.maxProjects
  const createProjectDisabled = isReadOnlyRole || submitting
  const lockedProjectIds = useMemo(() => {
    if (planLimits.maxProjects === null) return new Set<number>()
    const owned = projects
      .filter((project) => !selectedWorkspaceId || project.createdBy === selectedWorkspaceId)
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return bDate - aDate
      })
    const locked = owned.slice(planLimits.maxProjects).map((project) => project.id)
    return new Set(locked)
  }, [planLimits.maxProjects, projects, user?.id])

  const loadProjects = async () => {
    let res = await fetchWithAuth("/api/projects", { cache: "no-store" })
    if (res.status === 401) {
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
    setProjects(Array.isArray(data?.projects) ? sortProjectsByNewest(data.projects) : [])
  }

  const loadTemplates = async () => {
    try {
      let res = await fetchWithAuth("/api/templates", { cache: "no-store" })
      if (res.status === 401) {
        res = await fetchWithAuth("/api/templates", { cache: "no-store" })
      }

      if (!res.ok) {
        if (res.status === 401) {
          setTemplates([])
          return
        }

        const payload = await res.json().catch(() => null) as { message?: string } | null
        const message = payload?.message || "Failed to load templates"
        console.error("Failed to load templates:", message)
        toast.error(message)
        setTemplates([])
        return
      }

      const data = await res.json()

      const nextTemplates: TemplateOption[] = Array.isArray(data?.templates)
        ? data.templates.map((item: { id: string; title: string }) => ({
            id: item.id,
            title: item.title,
          }))
        : []

      setTemplates(nextTemplates)
    } catch (error) {
      console.error("Failed to load templates:", error)
      toast.error(error instanceof Error ? error.message : "Failed to load templates")
      setTemplates([])
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (!user?.id) {
      setProjects([])
      setTemplates([])
      setLoading(false)
      return
    }

    const loadInitial = async () => {
      try {
        await Promise.all([loadProjects(), loadTemplates()])
      } catch (error) {
        console.error("Failed to initialize projects page:", error)
        toast.error(error instanceof Error ? error.message : "Failed to load projects")
      } finally {
        setLoading(false)
      }
    }

    void loadInitial()
  }, [authLoading, user?.id])

  useEffect(() => {
    if (authLoading || !user?.id) return
    let active = true
    const loadWorkspaces = async () => {
      try {
        const res = await fetchWithAuth("/api/workspaces", { cache: "no-store" })
        const data = await res.json().catch(() => null) as { workspaces?: WorkspaceItem[] } | null
        if (!active) return
        let items = Array.isArray(data?.workspaces) ? data.workspaces : []
        items = ensureOwnerWorkspace(items)
        setWorkspaces(items)
        const stored = typeof window !== "undefined" ? window.localStorage.getItem("onvera:workspace") : null
        const preferred = stored && items.some((item) => item.id === stored) ? stored : null
        const fallback = items[0]?.id || null
        const nextId =
          preferred ||
          (items.some((item) => item.id === user.id) ? user.id : fallback)
        setSelectedWorkspaceId(nextId)
      } catch {
        setWorkspaces([])
      }
    }
    void loadWorkspaces()
    const handleWorkspace = () => {
      if (typeof window === "undefined") return
      void loadWorkspaces()
    }
    window.addEventListener("workspace:changed", handleWorkspace)
    window.addEventListener("storage", handleWorkspace)
    return () => {
      active = false
      window.removeEventListener("workspace:changed", handleWorkspace)
      window.removeEventListener("storage", handleWorkspace)
    }
  }, [authLoading, user?.id])

  useEffect(() => {
    if (typeof window === "undefined") return
    const media = window.matchMedia("(min-width: 1536px)")
    const update = () => setIs2xl(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  const filteredProjects = useMemo(() => {
    return sortProjectsByNewest(projects).filter((project) => {
      if (selectedWorkspaceId && project.createdBy !== selectedWorkspaceId) {
        return false
      }
      const statusMatch = statusFilter === "all" || project.status === statusFilter
      const templateMatch =
        templateFilter.includes("all") || templateFilter.includes(project.templateId)

      return statusMatch && templateMatch
    })
  }, [projects, selectedWorkspaceId, statusFilter, templateFilter])

  const ITEMS_PER_PAGE = projectsView === "table" ? 10 : is2xl ? 12 : 9
  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const projectsToShow = filteredProjects.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, templateFilter, projectsView, is2xl])

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
    if (projectLimitReached) {
      toast.error("Project limit reached for your plan.")
      return
    }
    setSubmitting(true)
    const optimisticId = -Date.now()
    const template = templates.find((item) => item.id === values.templateId)
    const optimisticProject: ProjectItem = {
      id: optimisticId,
      slug: `optimistic-${optimisticId}`,
      title: values.title,
      templateId: values.templateId,
      templateTitle: template?.title,
      status: "waiting",
      avatarSrc: values.avatarSrc || undefined,
      createdAt: new Date().toISOString(),
      members: [],
      createdBy: user?.id || null,
    }
    setProjects((prev) => [optimisticProject, ...prev])
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

      const payload = await res.json().catch(() => null) as { message?: string } | null

      if (!res.ok) {
        throw new Error(payload?.message || "Failed to create project")
      }

      if (payload && typeof payload === "object" && "slug" in payload) {
        setProjects((prev) => {
          const without = prev.filter((item) => item.id !== optimisticId)
          return [payload as ProjectItem, ...without]
        })
      } else {
        setProjects((prev) => prev.filter((item) => item.id !== optimisticId))
        await loadProjects()
      }
      setIsCreateOpen(false)
      toast.success("Project created")
    } catch (error) {
      setProjects((prev) => prev.filter((item) => item.id !== optimisticId))
      console.error("Create project failed:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create project")
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenCreate = () => {
    if (templates.length === 0) {
      toast.error("Create at least one template before starting a project.")
      return
    }
    if (projectLimitReached) {
      toast.error("Project limit reached for your plan.")
      return
    }
    setIsCreateOpen(true)
  }

  const handleEditProject = async (values: ProjectFormValues) => {
    if (!editingProject) return

    setSubmitting(true)
    const previousProject = editingProject
    const template = templates.find((item) => item.id === values.templateId)
    setProjects((prev) =>
      prev.map((project) =>
        project.slug === previousProject.slug
          ? {
              ...project,
              title: values.title,
              avatarSrc: values.avatarSrc || project.avatarSrc,
              templateId: values.templateId,
              templateTitle: template?.title || project.templateTitle,
            }
          : project,
      ),
    )
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
      setEditingProject(null)
      toast.success("Project updated")
    } catch (error) {
      setProjects((prev) =>
        prev.map((project) =>
          project.slug === previousProject.slug ? previousProject : project,
        ),
      )
      console.error("Update project failed:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update project")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!deletingProject) return

    setSubmitting(true)
    const projectToDelete = deletingProject
    setDeletingProject(null)
    setProjects((prev) => prev.filter((project) => project.id !== projectToDelete.id))
    try {
      const res = await fetchWithAuth(`/api/projects/${projectToDelete.slug}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { message?: string } | null
        throw new Error(payload?.message || "Failed to delete project")
      }
      toast.success("Project deleted")
    } catch (error) {
      setProjects((prev) => [projectToDelete, ...prev])
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
          buttonText={!createProjectDisabled ? "Create Project" : undefined}
          onClick={!createProjectDisabled ? handleOpenCreate : undefined}
          icon={<FolderOpenDot />}
        />
      ) : (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="flex flex-col lg:flex-row items-center justify-between px-7 gap-4 lg:gap-5">
            <p className="text-sm flex-1 lg:line-clamp-2">
              Manage and track all your projects and stay on top of deadlines in one place.
            </p>
            <div className="right-actions flex items-center gap-3 justify-end">
              <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white/70 p-1 dark:border-white/10 dark:bg-white/5">
                <Button
                  size="icon-sm"
                  variant={projectsView === "grid" ? "secondary" : "ghost"}
                  className="rounded-full"
                  onClick={() => setProjectsView("grid")}
                  aria-pressed={projectsView === "grid"}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="size-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant={projectsView === "table" ? "secondary" : "ghost"}
                  className="rounded-full"
                  onClick={() => setProjectsView("table")}
                  aria-pressed={projectsView === "table"}
                  aria-label="Table view"
                >
                  <List className="size-4" />
                </Button>
              </div>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden dark:border-white/10 dark:bg-white/5">
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
              {canManageProjects && (
                <Button
                  variant="gradient"
                  onClick={handleOpenCreate}
                  disabled={createProjectDisabled}
                >
                  <Plus strokeWidth={2} /> Create New
                </Button>
              )}
            </div>
          </div>

          <Separator className="my-0 bg-border" />

          {filteredProjects.length === 0 ? (
            <div className="px-7 pb-0 pt-0">
              <EmptyState
                title="No Projects Found"
                description="No projects match the selected template or status."
                buttonText="Reset filters"
                onClick={() => {
                  setTemplateFilter(["all"])
                  setStatusFilter("all")
                }}
                icon={<FolderOpenDot />}
              />
            </div>
          ) : (
            projectsView === "grid" ? (
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
                    isLocked={lockedProjectIds.has(project.id)}
                    onEdit={!canManageProjects || lockedProjectIds.has(project.id) ? undefined : () => setEditingProject(project)}
                    onDelete={!canManageProjects || lockedProjectIds.has(project.id) ? undefined : () => setDeletingProject(project)}
                  />
                ))}
              </div>
            ) : (
              <div className="px-7 pb-0 pt-0">
                <div className="rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
                  <Table className="[&_th]:px-5 [&_th]:py-3 [&_td]:px-5 [&_td]:py-3 text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead>Template</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectsToShow.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 rounded-lg">
                                {project.avatarSrc && <AvatarImage src={project.avatarSrc} />}
                                <AvatarFallback className={`font-semibold ${getAvatarColor(project.title)}`}>
                                  {project.title.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium">{project.title}</div>
                                {lockedProjectIds.has(project.id) ? (
                                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                                    <Lock className="size-3" />
                                    Locked
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {project.templateTitle || "-"}
                          </TableCell>
                          <TableCell>
                            {project.status ? (
                              <Badge className={`${statusStyles[project.status]}`}>
                                {statusLabel[project.status]}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {project.members && project.members.length > 0 ? (
                              <AvatarGroup className="justify-start">
                                {project.members.slice(0, 3).map((member) => (
                                  <Avatar key={member.id} size="sm">
                                    {member.image && <AvatarImage src={member.image} />}
                                    <AvatarFallback className={`${getAvatarColor(member.name)} font-semibold`}>
                                      {member.name.substring(0, 1).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                                {project.members.length > 3 && (
                                  <AvatarGroupCount className="bg-primary text-white dark:bg-violet-900">+{project.members.length - 3}</AvatarGroupCount>
                                )}
                              </AvatarGroup>
                            ) : (
                              <span className="text-xs text-muted-foreground">No members</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {project.createdAt
                              ? new Date(project.createdAt).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "-"}
                          </TableCell>
                        <TableCell className="text-right">
                          {canManageProjects && !lockedProjectIds.has(project.id) ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="icon-sm"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    aria-label="Project actions"
                                  >
                                    <MoreVertical className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-36">
                                  <DropdownMenuGroup>
                                    <DropdownMenuItem onClick={() => setEditingProject(project)} className="text-xs">
                                      <PencilIcon />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => setDeletingProject(project)}
                                       variant="destructive"  className="text-xs!">
                                            <TrashIcon />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuGroup>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )
          )}

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

      {canManageProjects ? (
        <ProjectModal
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          mode="create"
          templates={templates}
          loading={submitting}
          onSubmit={handleCreateProject}
        />
      ) : null}

      {canManageProjects ? (
        <ProjectModal
          open={Boolean(editingProject)}
          onOpenChange={(open) => {
            if (!open) {
              window.setTimeout(() => setEditingProject(null), 300)
            }
          }}
          mode="edit"
          templates={templates}
          loading={submitting}
          fixedTemplateId={editingProject?.templateId}
          initialValues={
            editingProject
              ? {
                  title: editingProject.title,
                  avatarSrc: editingProject.avatarSrc ?? "",
                  templateId: editingProject.templateId,
                }
              : undefined
          }
          onSubmit={handleEditProject}
        />
      ) : null}

      {canManageProjects && <DeleteProjectAlert
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
