"use client"


import { Bell, ChevronsUpDown, CircleUserRound, CreditCard, EllipsisVertical, LogOut } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

import { User } from "@supabase/supabase-js"
import { logout } from "@/services/auth"
import { useRouter } from "next/navigation"
import { Badge } from "../ui/badge"

import { getTeamMemberName } from "@/services/team-member"
import { useEffect, useState } from "react"

type NavUserProps = {
  user?: User,
  role?: string
}


export function NavUser({user, role} : NavUserProps){
  const { isMobile } = useSidebar()
  
  const router = useRouter()

  const [memberName, setMemberName] = useState<string | null>(null)

  useEffect(() => {
    const fetchMember = async () => {
      if (!user?.id) return

      const name = await getTeamMemberName(user.id)
      setMemberName(name)
    }

    fetchMember()
  }, [user])

  const displayName =  memberName || user?.user_metadata?.display_name || "User"

  const handleLogout = async () => {
    await logout()
    router.push("/login")
    router.refresh()
  }

  return (
    <>
    <div className="text-center">
      <div className="inline-block bg-violet-100 p-1 rounded-sm px-2 mx-auto text-xs capitalize text-primary font-medium">Managed by - <span className="text-violet-900 capitalize">{role}</span></div>
    </div>    
    <SidebarMenu className="">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground bg-white rounded-full border border-violet-100"
            >
              <Avatar className="h-8 w-8 rounded-full">
                {/* <AvatarImage src={user?.avatar} alt={user?.name} /> */}
                <AvatarFallback className="rounded-lg font-bold text-black bg-blue-100 uppercase">{displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {user?.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl p-0"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={10}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 p-3 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-full">
                  {/* <AvatarImage src={user.avatar} alt={user.name} /> */}
                  <AvatarFallback className="rounded-full font-bold text-black bg-blue-100 uppercase">{displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user?.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup className="p-1">
              <DropdownMenuItem>
                <CircleUserRound />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell />
                Notifications
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
            </DropdownMenuGroup>
            {/* <DropdownMenuSeparator /> */}            
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
    </>
  )
}
