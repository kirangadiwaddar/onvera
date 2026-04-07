"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { CalendarDays, ArrowLeft, Monitor, Moon, Sun } from "lucide-react"

import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { Button } from "./ui/button"
import { NotificationBell } from "@/components/notifications/notification-bell"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system")
  const dateLabel = useMemo(() => {
    const now = new Date()
    const day = now.getDate()
    const month = now.toLocaleString("en-US", { month: "short" })
    const year = now.getFullYear()
    return `${day} ${month}, ${year}`
  }, [])
  const [dynamicTitle, setDynamicTitle] = useState<{
    id: string
    title: string
    kind: "template" | "project" | "team"
  } | null>(null)

  const segments = pathname.split("/").filter(Boolean)

  // slug page = more than 1 segment
  const isDetailPage = segments.length > 1
  const hideBackForPath = pathname === "/admin/plan-manager"

  // parent path (e.g., "/projects")
  const parentPath = "/" + segments[0]

  const formatSlugTitle = (raw: string) => {
    const decoded = decodeURIComponent(raw)
    return decoded
      .split("/")
      .map((segment) =>
        segment
          .split("-")
          .map((word) => (word.length <= 3 ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)))
          .join(" ")
      )
      .join("/")
  }

  const getTitle = () => {
    if (pathname === "/") return "Home";

    const segments = pathname.split("/").filter(Boolean)

    if (dynamicTitle) {
      if (dynamicTitle.kind === "template" && segments[0] === "templates" && segments[1] === dynamicTitle.id) {
        return dynamicTitle.title
      }
      if (dynamicTitle.kind === "project" && segments[0] === "projects" && segments[1] === dynamicTitle.id) {
        return dynamicTitle.title
      }
      if (dynamicTitle.kind === "team" && segments[0] === "teams" && segments[1] === dynamicTitle.id) {
        return dynamicTitle.title
      }
    }

    // fallback formatting
    const last = segments[segments.length - 1];
    return last ? formatSlugTitle(last) : "Home";
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    const saved = window.localStorage.getItem("onvera-theme")
    if (saved === "light" || saved === "dark" || saved === "system") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(saved)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const root = document.documentElement
    const media = window.matchMedia("(prefers-color-scheme: dark)")

    const apply = (isDark: boolean) => {
      root.classList.toggle("dark", isDark)
    }

    let cleanup: (() => void) | undefined

    if (theme === "dark") {
      apply(true)
    } else if (theme === "light") {
      apply(false)
    } else {
      apply(media.matches)
      const handleChange = (event: MediaQueryListEvent) => apply(event.matches)
      media.addEventListener("change", handleChange)
      cleanup = () => media.removeEventListener("change", handleChange)
    }

    window.localStorage.setItem("onvera-theme", theme)

    return () => cleanup?.()
  }, [theme])

  useEffect(() => {
    const segments = pathname.split("/").filter(Boolean)
    const section = segments[0]
    const id = segments[1]

    if (!section || !id) {
      setDynamicTitle(null)
      return
    }

    const abort = new AbortController()

    const loadDynamicTitle = async () => {
      try {
        if (section === "templates") {
          const res = await fetchWithAuth("/api/templates", { cache: "no-store", signal: abort.signal })
          const data = await res.json()
          const templates = Array.isArray(data?.templates) ? data.templates : []
          const found = templates.find((template: { id?: string; title?: string }) => template.id === id)
          if (found?.title) {
            setDynamicTitle({ id, title: found.title, kind: "template" })
          } else {
            setDynamicTitle(null)
          }
          return
        }

        if (section === "projects") {
          const res = await fetchWithAuth(`/api/projects/${id}`, { cache: "no-store", signal: abort.signal })
          const data = await res.json()
          const title = data?.project?.title
          if (typeof title === "string" && title.trim()) {
            setDynamicTitle({ id, title, kind: "project" })
          } else {
            setDynamicTitle(null)
          }
          return
        }

        if (section === "teams") {
          const res = await fetchWithAuth(`/api/teams/${id}`, { cache: "no-store", signal: abort.signal })
          const data = await res.json()
          const title = data?.team?.name
          if (typeof title === "string" && title.trim()) {
            setDynamicTitle({ id, title, kind: "team" })
          } else {
            setDynamicTitle(null)
          }
          return
        }

        setDynamicTitle(null)
      } catch {
        setDynamicTitle(null)
      }
    }

    void loadDynamicTitle()

    return () => abort.abort()
  }, [pathname])


  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b border-border bg-white text-zinc-900 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) dark:bg-[#0b0b13] dark:text-white">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-1 sm:mx-2 data-[orientation=vertical]:h-4"
        />

        {isDetailPage && !hideBackForPath && (<>
          <Button variant="ghost"
            size="icon"

            onClick={() => router.push(parentPath)}
            className="size-7"
          >
            <ArrowLeft size={26} />
          </Button>
          <Separator
            orientation="vertical"
            className="mx-1 sm:mx-2 data-[orientation=vertical]:h-4"
          />
        </>
        )}


        <h1 className="text-base font-medium truncate">{getTitle()}</h1>
        <div className="ml-auto flex items-center">
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Separator orientation="vertical" className="mx-1 sm:mx-2 data-[orientation=vertical]:h-5" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white/80 text-zinc-500 transition hover:border-violet-200 hover:text-violet-900 hover:bg-violet-100 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:text-white",
                  )}
                  aria-label="Theme switcher"
                >
                  {theme === "light" ? (
                    <Sun className="h-4 w-4" />
                  ) : theme === "dark" ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Monitor className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-36">
                <DropdownMenuItem onSelect={() => setTheme("light")}>
                  <Sun /> Light
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setTheme("dark")}>
                  <Moon /> Dark
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setTheme("system")}>
                  <Monitor /> System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
