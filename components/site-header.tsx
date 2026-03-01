"use client"

import { usePathname, useRouter } from "next/navigation";

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { CalendarDays, ArrowLeft } from "lucide-react"

import { projects } from "@/src/mocks/data/projects.json"
import { Button } from "./ui/button";

export function SiteHeader() {

  const pathname = usePathname();
  const router = useRouter();

  const segments = pathname.split("/").filter(Boolean)

  // slug page = more than 1 segment
  const isDetailPage = segments.length > 1

  // parent path (e.g., "/projects")
  const parentPath = "/" + segments[0]

  const getTitle = () => {
    if (pathname === "/") return "Home";

    const segments = pathname.split("/").filter(Boolean);

    // Example: /projects/portfolio-site
    if (segments[0] === "projects" && segments[1]) {
      const project = projects.find(
        (p) => p.slug === segments[1]
      );

      if (project) return project.title;
    }

    // fallback formatting
    const last = segments[segments.length - 1];
    return last
      ? last
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
      : "Home";
  };

  const today = new Date();

  const day = today.getDate();
  const month = today.toLocaleString("en-US", { month: "short" });
  const year = today.getFullYear();


  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b border-b-gray-200 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
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
          <div className="flex items-center gap-2 ">
            <p className="text-[12px] text-black uppercase">{`${day} ${month}, ${year}`}</p>
            <span className="w-8 h-8 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center"><CalendarDays size={16} /></span>
          </div>
        </div>
      </div>
    </header>
  )
}
