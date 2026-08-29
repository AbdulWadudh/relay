import { cookies } from "next/headers"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import config from "@/config"
import { LOCAL_USER } from "@/lib/vault"

export default async function DashboardLayout({
  children,
}: React.PropsWithChildren) {
  // The sidebar persists its open state in the "sidebar_state" cookie;
  // read it server-side so a refresh keeps the collapsed state.
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        user={{
          name: LOCAL_USER.name,
          email: LOCAL_USER.email,
          avatar: config.assets.logo,
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
