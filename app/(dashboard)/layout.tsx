import { AppSidebar } from "@/components/app-sidebar"
import { SectionCards } from "@/components/dashboard/section-cards"
import { SiteHeader } from "@/components/site-header"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 62)",
          "--header-height": "calc(var(--spacing) * 16)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="shadow-none! border border-gray-200">
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
          {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
