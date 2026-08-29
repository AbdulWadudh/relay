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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
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
    idle: "hover:bg-emerald-500/10 hover:text-emerald-300",
    active:
      "bg-emerald-500/15 text-emerald-300 data-[active=true]:bg-emerald-500/15 data-[active=true]:text-emerald-300",
    glow: "text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]",
  },
  {
    href: "/agents",
    label: "Agents",
    icon: Robot01Icon,
    idle: "hover:bg-violet-500/10 hover:text-violet-300",
    active:
      "bg-violet-500/15 text-violet-300 data-[active=true]:bg-violet-500/15 data-[active=true]:text-violet-300",
    glow: "text-violet-400 drop-shadow-[0_0_6px_rgba(167,139,250,0.6)]",
  },
  {
    href: "/queue",
    label: "Queue",
    icon: Queue01Icon,
    idle: "hover:bg-amber-500/10 hover:text-amber-300",
    active:
      "bg-amber-500/15 text-amber-300 data-[active=true]:bg-amber-500/15 data-[active=true]:text-amber-300",
    glow: "text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings01Icon,
    idle: "hover:bg-sky-500/10 hover:text-sky-300",
    active:
      "bg-sky-500/15 text-sky-300 data-[active=true]:bg-sky-500/15 data-[active=true]:text-sky-300",
    glow: "text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]",
  },
] as const

export function AppSidebar({
  user,
  ...props
}: { user: ProfileUser } & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="group/logo transition-colors duration-200 hover:bg-emerald-500/10"
              render={<Link href="/" />}
            >
              <Image
                src={config.assets.logo}
                alt={config.app.name}
                width={36}
                height={36}
                className="size-9 rounded-md transition-transform duration-300 ease-out group-hover/logo:-rotate-6 group-hover/logo:scale-110"
              />
              <div className="grid flex-1 text-start leading-tight">
                <span className="truncate font-heading font-semibold text-base tracking-wide transition-colors duration-200 group-hover/logo:text-emerald-300">
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
          <SidebarMenu>
            {NAV.map((item, index) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <SidebarMenuItem
                  key={item.href}
                  style={{ animationDelay: `${index * 60}ms` }}
                  className="fade-in slide-in-from-left-2 animate-in fill-mode-both"
                >
                  <SidebarMenuButton
                    tooltip={item.label}
                    isActive={active}
                    className={cn(
                      "group/nav h-11 gap-3 px-3 text-[15px] transition-all duration-200 hover:translate-x-0.5 active:scale-[0.98] [&_svg]:size-5",
                      active ? item.active : item.idle,
                    )}
                    render={<Link href={item.href} />}
                  >
                    <HugeiconsIcon
                      icon={item.icon}
                      strokeWidth={1.5}
                      className={cn(
                        "transition-all duration-200 group-hover/nav:scale-110",
                        active && item.glow,
                      )}
                    />
                    <span>{item.label}</span>
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
      <SidebarRail />
    </Sidebar>
  )
}
