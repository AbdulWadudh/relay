"use client"

import {
  Settings01Icon,
  UnfoldMoreIcon,
  VaultIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { authClient } from "@/lib/auth-client"
import { avatarGradient, initials } from "@/lib/avatar"

export interface ProfileUser {
  name: string
  email: string
  // Social login providers give a real profile picture; local email/password
  // accounts don't, and should fall back to initials (AvatarFallback) rather
  // than a fake image — leave this unset for that case instead of pointing
  // it at a placeholder, which would always "load" and hide the fallback.
  avatar?: string
}

export function NavUser({ user }: { user: ProfileUser }) {
  const { isMobile } = useSidebar()
  const router = useRouter()

  async function signOut() {
    await authClient.signOut()
    router.push("/login")
    router.refresh()
  }
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="transition-all duration-200 hover:bg-muted aria-expanded:bg-muted"
              />
            }
          >
            <Avatar className="rounded-md">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback
                className="rounded-md font-semibold text-white/90 text-xs tracking-wide shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_2px_rgba(0,0,0,0.35)] ring-1 ring-white/10"
                style={{ backgroundImage: avatarGradient(user.email) }}
              >
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-start text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-muted-foreground text-xs">
                {user.email}
              </span>
            </div>
            <HugeiconsIcon
              icon={UnfoldMoreIcon}
              strokeWidth={2}
              className="ms-auto size-4"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-fit min-w-48"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                  <Avatar className="rounded-md">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback
                      className="rounded-md font-semibold text-white/90 text-xs tracking-wide shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_2px_rgba(0,0,0,0.35)] ring-1 ring-white/10"
                      style={{ backgroundImage: avatarGradient(user.email) }}
                    >
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-start text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-muted-foreground text-xs">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                render={<Link href="/vault" />}
                className="transition-colors duration-200 focus:bg-emerald-600 focus:text-white"
              >
                <HugeiconsIcon icon={VaultIcon} strokeWidth={2} />
                Credential vault
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<Link href="/settings" />}
                className="transition-colors duration-200 focus:bg-sky-600 focus:text-white"
              >
                <HugeiconsIcon icon={Settings01Icon} strokeWidth={2} />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={signOut}
                className="transition-colors duration-200 focus:bg-red-600 focus:text-white"
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
