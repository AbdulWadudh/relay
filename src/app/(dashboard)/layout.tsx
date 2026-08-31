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
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        user={{
          name: session.user.name,
          email: session.user.email,
          avatar: session.user.image ?? undefined,
        }}
      />
      <SidebarInset className="relative flex h-svh flex-col overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.06),transparent_55%)]"
        />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
