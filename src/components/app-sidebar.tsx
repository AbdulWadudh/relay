"use client"

import {
  Queue01Icon,
  Robot01Icon,
  Settings01Icon,
  VaultIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { NavUser, type ProfileUser } from "@/components/nav-user"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import config from "@/config"
import { cn } from "@/lib/utils"

/**
 * App chrome per RULES.md: ShadCN sidebar-07 (icon-collapsible) with a
 * profile footer. Vivid UI — every nav item owns a unique hover accent.
 */

const NAV = [
  {
    href: "/vault",
    label: "Vault",
    icon: VaultIcon,
    idle: "hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600",
    // `data-active:` (presence-based) matches the shorthand variant baked
    // into SidebarMenuButton's own `data-active:bg-sidebar-accent
    // data-active:text-sidebar-accent-foreground` — same specificity, so
    // whichever comes last in the merged className wins (ours does). An
    // unconditional `text-emerald-300` here previously lost that fight and
    // never rendered.
    active:
      "data-active:bg-emerald-600 data-active:text-white dark:data-active:bg-emerald-600",
    soon: false,
  },
  {
    href: "/agents",
    label: "Agents",
    icon: Robot01Icon,
    idle: "hover:bg-violet-600 hover:text-white dark:hover:bg-violet-600",
    active:
      "data-active:bg-violet-600 data-active:text-white dark:data-active:bg-violet-600",
    soon: false,
  },
  {
    href: "/queue",
    label: "Queue",
    icon: Queue01Icon,
    idle: "hover:bg-amber-600 hover:text-white dark:hover:bg-amber-600",
    active:
      "data-active:bg-amber-600 data-active:text-white dark:data-active:bg-amber-600",
    soon: false,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings01Icon,
    idle: "hover:bg-sky-600 hover:text-white dark:hover:bg-sky-600",
    active:
      "data-active:bg-sky-600 data-active:text-white dark:data-active:bg-sky-600",
    soon: false,
  },
] as const

export function AppSidebar({
  user,
  ...props
}: { user: ProfileUser } & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="group/logo transition-colors duration-200 hover:bg-muted"
              onClick={closeOnMobile}
              render={<Link href="/vault" />}
            >
              <Image
                src={config.assets.logo}
                alt={config.app.name}
                width={36}
                height={36}
                preload
                className="size-9 rounded-md transition-transform duration-300 ease-out group-hover/logo:-rotate-6 group-hover/logo:scale-110"
              />
              <div className="grid flex-1 text-start leading-tight">
                <span className="truncate font-heading font-semibold text-base tracking-wide transition-colors duration-200 group-hover/logo:text-emerald-700 dark:group-hover/logo:text-emerald-300">
                  {config.app.name}
                </span>
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  {config.app.version}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-2">
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    tooltip={
                      item.soon ? `${item.label} — coming soon` : item.label
                    }
                    isActive={active}
                    disabled={item.soon}
                    aria-disabled={item.soon}
                    onClick={item.soon ? undefined : closeOnMobile}
                    className={cn(
                      "group/nav h-11 gap-3 px-3 text-[15px] transition-all duration-200 [&_svg]:size-5",
                      item.soon
                        ? "cursor-not-allowed opacity-50 hover:translate-x-0 active:scale-100"
                        : "hover:translate-x-0.5 active:scale-[0.98]",
                      active ? item.active : item.idle,
                    )}
                    render={item.soon ? undefined : <Link href={item.href} />}
                  >
                    <HugeiconsIcon
                      icon={item.icon}
                      strokeWidth={1.5}
                      className="transition-all duration-200 group-hover/nav:scale-110"
                    />
                    <span>{item.label}</span>
                    {item.soon ? (
                      <Badge
                        variant="outline"
                        className="ms-auto group-data-[collapsible=icon]:hidden"
                      >
                        Soon
                      </Badge>
                    ) : null}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <ThemeToggle />
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
