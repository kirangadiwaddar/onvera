"use client"

import { LucideIcon, Plus } from "lucide-react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
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


  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu className="group-data-[state=collapsed]:gap-3 group-data-[state=collapsed]:mt-4">
          {items.map((item) => {
            const isActive = pathname.startsWith(item.url)
            return (
            <SidebarMenuItem key={item.title}>
              <Link href={item.url}>
              <SidebarMenuButton tooltip={item.title} size="lg" className={`pl-3 group-data-[state=collapsed]:gap-0 group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:p-5! group-data-[state=collapsed]:rounded-full! transition-colors cursor-pointer ${
                    isActive
                      ? "bg-linear-to-r from-violet-100 to-violet-50 text-violet-900 font-medium hover:text-violet-900 dark:from-violet-300 dark:to-violet-100/50"
                      : "hover:bg-linear-to-r from-violet-100 to-violet-50 hover:text-violet-900 dark:from-violet-300 dark:to-violet-100/50"
                  }`}>
                {item.icon && <item.icon className="size-5!" strokeWidth={2} />}
                <span className="text-sm group-data-[state=collapsed]:hidden">{item.title}</span>
              </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
