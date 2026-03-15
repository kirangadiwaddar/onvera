"use client"

import { LucideIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
  }[]
}) {

  const pathname = usePathname()

  const primaryItems = items.slice(0, 2)
  const workspaceItems = items.slice(2)

  const renderItems = (navItems: typeof items) =>
    navItems.map((item) => {
      const isActive = pathname.startsWith(item.url)
      return (
        <SidebarMenuItem key={item.title}>
          <Link href={item.url}>
            <SidebarMenuButton
              tooltip={item.title}
              size="default"
              className={`pl-2.5 group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:p-2! group-data-[state=collapsed]:rounded-md! transition-colors cursor-pointer ${
                isActive
                  ? "bg-sidebar-accent text-violet-700 font-medium dark:text-violet-300"
                  : "text-zinc-700 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:text-white/80"
              }`}
            >
              {item.icon && <item.icon className="size-4" strokeWidth={isActive ? 2.2 : 1.8} />}
              <span className="text-sm group-data-[state=collapsed]:hidden">{item.title}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      )
    })

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-1">
        <SidebarMenu className="group-data-[state=collapsed]:gap-2 group-data-[state=collapsed]:mt-2">
          {renderItems(primaryItems)}
        </SidebarMenu>
        {workspaceItems.length > 0 ? (
          <div className="pt-3">
            <div className="px-3 pt-2 pb-1 text-xs font-medium text-zinc-500 group-data-[state=collapsed]:hidden dark:text-white/40">
              Workspace
            </div>
            <SidebarMenu className="mt-1 group-data-[state=collapsed]:gap-2">
              {renderItems(workspaceItems)}
            </SidebarMenu>
          </div>
        ) : null}
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
