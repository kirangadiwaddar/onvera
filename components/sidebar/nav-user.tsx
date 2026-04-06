"use client"

import { useState } from "react"
import { ChevronsUpDown, CircleUserRound, LogOut, CreditCard } from "lucide-react"
import { USER_ROLE_LABELS, isUserRole } from "@/lib/auth/roles"
import { AccountSettingsModal } from "@/components/account/account-settings-modal"
import Link from "next/link"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { getAvatarColor } from "@/lib/get-avatar-colors"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
} from "@/components/ui/sidebar"

export function NavUser({
  user,
  role,
  managedByLabel,
  managedByPrefix = "Managed by",
  hideManagedBy = false,
  onLogout,
}: {
  user: {
    id?: string
    name: string
    email: string
    avatar?: string
  }
  role?: string | null
  managedByLabel?: string | null
  managedByPrefix?: string
  hideManagedBy?: boolean
  onLogout?: () => Promise<void> | void
}) {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showAccountDialog, setShowAccountDialog] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const roleLabel = role === "super_admin" ? "Super Admin" : role && isUserRole(role) ? USER_ROLE_LABELS[role] : "User"
  const managedBy = managedByLabel || roleLabel

  return (
    <>
    {!hideManagedBy ? (
      <div className="text-center group-data-[collapsible=icon]:hidden">
        <div className="inline-block rounded-sm bg-violet-100 px-2 py-1 text-xs capitalize text-primary dark:bg-violet-500/15">
          {managedByPrefix} -{" "}
          <span className="text-violet-900 font-semibold capitalize dark:text-violet-200">
            {managedBy}
          </span>
        </div>
      </div>
    ) : null}
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="pl-2 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground bg-white rounded-2xl border border-violet-100 dark:border-white/10 dark:bg-white/5"
              >
                
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className={`rounded-full font-bold ${getAvatarColor(user.name)}`}>
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-54 rounded-xl p-0"
              // side={isMobile ? "bottom" : "right"}
              align="end"
              // sideOffset={}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 p-3 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-full">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className={`rounded-full font-bold ${getAvatarColor(user.name)}`}>
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup className="p-1">
                <DropdownMenuItem
                  onSelect={() => {
                    setShowAccountDialog(true)
                    setMenuOpen(false)
                  }}
                >
                  <CircleUserRound />
                  Account
                </DropdownMenuItem>
                {role === "super_admin" ? (
                  <DropdownMenuItem
                    asChild
                    onSelect={() => {
                      setMenuOpen(false)
                    }}
                  >
                    <Link href="/billing">
                      <CreditCard />
                      Billing
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(event) => {
                    event.preventDefault()
                    setShowLogoutDialog(true)
                  }}
                >
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                void onLogout?.()
              }}
            >
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AccountSettingsModal open={showAccountDialog} onOpenChange={setShowAccountDialog} />
    </>
  )
}
