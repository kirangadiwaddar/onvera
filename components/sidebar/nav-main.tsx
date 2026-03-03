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
        <SidebarMenu className="group-data-[state=collapsed]:gap-2 group-data-[state=collapsed]:mt-4">
          {items.map((item) => {
            const isActive = pathname.startsWith(item.url)
            return (
            <SidebarMenuItem key={item.title}>
              <Link href={item.url}>
              <SidebarMenuButton tooltip={item.title} size="lg" className={`pl-3 group-data-[state=collapsed]:gap-0 group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:p-5! rounded-full transition-colors cursor-pointer ${
                    isActive
                      ? "bg-linear-to-r from-violet-100 to-violet-100 text-violet-900 font-medium pl-5"
                      : "hover:bg-linear-to-r from-violet-100 to-violet-50 hover:text-violet-900 hover:pl-5 transition-all duration-200"
                  }`}>
                {/* {isActive ? <span className="text-sm group-data-[state=collapsed]:hidden w-2 h-2 rounded-full bg-violet-700"></span> : null} */}
                {item.icon && <item.icon className="size-5!" strokeWidth={1.5} />}
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
