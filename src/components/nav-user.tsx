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

export interface ProfileUser {
  name: string
  email: string
  // Social login providers give a real profile picture; local email/password
  // accounts don't, and should fall back to initials (AvatarFallback) rather
  // than a fake image — leave this unset for that case instead of pointing
  // it at a placeholder, which would always "load" and hide the fallback.
  avatar?: string
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("")
}

// Curated gradient set in the app's emerald/lime editorial-tech palette (plus
// a few accent hues for visual variety once multiple users share a sidebar).
// Picked deterministically from the user's email so the same person always
// gets the same avatar color instead of it changing on every render.
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #6ee7b7 0%, #047857 100%)",
  "linear-gradient(135deg, #d8f27e 0%, #4d6b39 100%)",
  "linear-gradient(135deg, #7dd3fc 0%, #0369a1 100%)",
  "linear-gradient(135deg, #fcd34d 0%, #b45309 100%)",
  "linear-gradient(135deg, #c4b5fd 0%, #6d28d9 100%)",
  "linear-gradient(135deg, #fda4af 0%, #9f1239 100%)",
]

function avatarGradient(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
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
                className="transition-all duration-200 hover:bg-emerald-500/10 aria-expanded:bg-emerald-500/10"
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
                className="transition-colors duration-200 focus:bg-emerald-500/10 focus:text-emerald-300"
              >
                <HugeiconsIcon icon={VaultIcon} strokeWidth={2} />
                Credential vault
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<Link href="/settings" />}
                className="transition-colors duration-200 focus:bg-sky-500/10 focus:text-sky-300"
              >
                <HugeiconsIcon icon={Settings01Icon} strokeWidth={2} />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={signOut}
                className="transition-colors duration-200 focus:bg-red-500/10 focus:text-red-300"
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
