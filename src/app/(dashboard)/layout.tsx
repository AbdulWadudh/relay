import { cookies } from "next/headers"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { requireSession } from "@/lib/auth-session"

export default async function DashboardLayout({
  children,
}: React.PropsWithChildren) {
  const session = await requireSession()
  // The sidebar persists its open state in the "sidebar_state" cookie;
  // read it server-side so a refresh keeps the collapsed state.
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      // Roomier icon rail: 3.5rem leaves 40px of content between the
      // group's padding, which is exactly the collapsed button size.
      style={{ "--sidebar-width-icon": "3.5rem" } as React.CSSProperties}
    >
      <AppSidebar
        user={{
          name: session.user.name,
          email: session.user.email,
          avatar: session.user.image ?? undefined,
        }}
      />
      <SidebarInset className="flex h-svh flex-col overflow-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
