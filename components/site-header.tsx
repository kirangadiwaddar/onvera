"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { CalendarDays, ArrowLeft, Monitor, Moon, Sun } from "lucide-react"

import { projects } from "@/src/mocks/data/projects.json"
import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { Button } from "./ui/button"
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
  const [mounted, setMounted] = useState(false)
  const [dateLabel, setDateLabel] = useState("")
  const [dynamicTitle, setDynamicTitle] = useState<string | null>(null)

  const segments = pathname.split("/").filter(Boolean)

  // slug page = more than 1 segment
  const isDetailPage = segments.length > 1

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

    if (dynamicTitle) return dynamicTitle

    // fallback formatting
    const last = segments[segments.length - 1];
    return last ? formatSlugTitle(last) : "Home";
  }

  useEffect(() => {
    setMounted(true)
    if (typeof window === "undefined") return
    const saved = window.localStorage.getItem("onvera-theme")
    if (saved === "light" || saved === "dark" || saved === "system") {
      setTheme(saved)
    }
  }, [])

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return
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
  }, [theme, mounted])

  useEffect(() => {
    if (typeof window === "undefined") return
    const now = new Date()
    const day = now.getDate()
    const month = now.toLocaleString("en-US", { month: "short" })
    const year = now.getFullYear()
    setDateLabel(`${day} ${month}, ${year}`)
  }, [])

  useEffect(() => {
    setDynamicTitle(null)
    const segments = pathname.split("/").filter(Boolean)
    const isTemplateDetail = segments[0] === "templates" && Boolean(segments[1])
    if (!isTemplateDetail) return

    const templateId = segments[1]
    fetchWithAuth("/api/templates", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const templates = Array.isArray(data?.templates) ? data.templates : []
        const found = templates.find((template: { id?: string; title?: string }) => template.id === templateId)
        if (found?.title) {
          setDynamicTitle(found.title)
        }
      })
      .catch(() => null)
  }, [pathname])


  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b border-border bg-white text-zinc-900 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) dark:bg-[#0b0b13] dark:text-white">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />

        {isDetailPage && (<>
          <Button variant="ghost"
            size="icon"

            onClick={() => router.push(parentPath)}
            className="size-7"
          >
            <ArrowLeft size={26} />
          </Button>
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
        </>
        )}


        <h1 className="text-base font-medium">{getTitle()}</h1>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2">
            <p className="text-[12px] uppercase text-zinc-600 dark:text-white/70">
              {dateLabel}
            </p>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-50 text-violet-600 dark:bg-white/5 dark:text-violet-200">
              <CalendarDays size={16} />
            </span>
            <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-6" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white/80 text-zinc-500 transition hover:text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:text-white",
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
                </button>
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
