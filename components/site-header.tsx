"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { CalendarDays, ArrowLeft } from "lucide-react"
import { Button } from "./ui/button"

export function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()

  const [title, setTitle] = useState("Dashboard")

  const segments = pathname.split("/").filter(Boolean)

  const isDetailPage = segments.length > 1
  const parentPath = "/" + segments[0]

  useEffect(() => {
    const resolveTitle = async () => {
      if (pathname === "/") {
        setTitle("Home")
        return
      }

      const segments = pathname.split("/").filter(Boolean)

      // If on project detail page
      if (segments[0] === "projects" && segments[1]) {
        try {
          const res = await fetch(`/api/projects/${segments[1]}`, {
            cache: "no-store",
          })

          if (!res.ok) {
            setTitle("Project")
            return
          }

          const data = await res.json()
          setTitle(data.title || "Project")
        } catch (err) {
          console.error("Header fetch failed:", err)
          setTitle("Project")
        }

        return
      }

      // Fallback: format last URL segment
      const last = segments[segments.length - 1]

      if (!last) {
        setTitle("Home")
        return
      }

      const formatted = last
        .split("-")
        .map((word) =>
          word.charAt(0).toUpperCase() + word.slice(1)
        )
        .join(" ")

      setTitle(formatted)
    }

    resolveTitle()
  }, [pathname])

  const today = new Date()
  const day = today.getDate()
  const month = today.toLocaleString("en-US", { month: "short" })
  const year = today.getFullYear()

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b border-b-gray-200 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />

        {isDetailPage && (
          <>
            <Button
              variant="ghost"
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

        <h1 className="text-base font-medium">{title}</h1>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2">
            <p className="text-[12px] text-black uppercase">
              {`${day} ${month}, ${year}`}
            </p>
            <span className="w-8 h-8 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center">
              <CalendarDays size={16} />
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}