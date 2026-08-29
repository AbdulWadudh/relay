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

import config from "@/config"
import { cn } from "@/lib/utils"

/**
 * Fixed-viewport dashboard shell (RULES.md: root never scrolls).
 * Left rail navigation + workbench; the content panel is the only
 * scroll container.
 */

const NAV = [
  { href: "/vault", label: "Vault", icon: VaultIcon },
  { href: "/agents", label: "Agents", icon: Robot01Icon },
  { href: "/queue", label: "Queue", icon: Queue01Icon },
  { href: "/settings", label: "Settings", icon: Settings01Icon },
] as const

export function AppShell({ children }: React.PropsWithChildren) {
  const pathname = usePathname()

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <aside className="flex w-56 shrink-0 flex-col border-e">
        <div className="flex h-14 items-center gap-2.5 border-b px-4">
          <Image
            src={config.assets.logo}
            alt={config.app.name}
            width={24}
            height={24}
            className="size-6"
          />
          <span className="font-heading font-semibold text-sm tracking-wide">
            {config.app.name}
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors duration-200",
                  active
                    ? "bg-primary/15 text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <HugeiconsIcon
                  icon={item.icon}
                  strokeWidth={1.5}
                  className={cn("size-4", active && "text-primary")}
                />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t px-4 py-3">
          <p className="font-mono text-[11px] text-muted-foreground">
            {config.app.name} {config.app.version}
          </p>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  )
}

/** Workbench header bar; sits above the scrollable panel. */
export function ShellHeader({
  title,
  children,
}: React.PropsWithChildren<{ title: string }>) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-6">
      <h1 className="font-semibold text-base">{title}</h1>
      {children ? (
        <div className="flex items-center gap-2">{children}</div>
      ) : null}
    </header>
  )
}

/** The single designated scroll container of the shell. */
export function ShellContent({ children }: React.PropsWithChildren) {
  return <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
}
