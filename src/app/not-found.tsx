import {
  ArrowLeft01Icon,
  Compass01Icon,
  Home01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import config from "@/config"

export const metadata = { title: "Page not found" }

/**
 * Public, standalone 404 for routes reached before any dashboard layout is
 * involved. Signed-in visitors never land here: the (dashboard) route
 * group's `[...catchAll]` page requires a session and defers to
 * `(dashboard)/not-found.tsx` instead, which keeps the sidebar mounted.
 */
export default function NotFound() {
  const primary = { href: "/login", label: "Sign in", icon: Home01Icon }

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-6 py-16">
      <Link
        href="/"
        className="fade-in slide-in-from-top-2 absolute start-8 top-8 z-10 animate-in fill-mode-both"
      >
        <Image
          src={config.assets.logo}
          alt={config.app.name}
          width={36}
          height={36}
          preload
          className="size-9 rounded-md transition-transform duration-300 ease-out hover:-rotate-6 hover:scale-110"
        />
      </Link>

      <div className="relative z-10 flex max-w-xl flex-col items-center text-center">
        <div
          className="fade-in zoom-in-95 mb-8 flex size-20 animate-in items-center justify-center rounded-2xl bg-emerald-600 fill-mode-both"
          style={{ animationDelay: "60ms" }}
        >
          <HugeiconsIcon
            icon={Compass01Icon}
            strokeWidth={1.5}
            className="size-10 text-white"
          />
        </div>

        <p
          className="fade-in slide-in-from-bottom-2 animate-in fill-mode-both font-mono text-7xl text-muted-foreground/25 tracking-tight sm:text-8xl"
          style={{ animationDelay: "120ms" }}
        >
          404
        </p>
        <h1
          className="fade-in slide-in-from-bottom-2 -mt-6 animate-in fill-mode-both font-heading font-semibold text-3xl tracking-tight sm:text-4xl"
          style={{ animationDelay: "180ms" }}
        >
          This route wandered off the map.
        </h1>
        <p
          className="fade-in slide-in-from-bottom-2 mt-4 max-w-md animate-in text-balance fill-mode-both text-base text-muted-foreground"
          style={{ animationDelay: "240ms" }}
        >
          The page you're looking for doesn't exist, moved, or never made it
          past a Ray's imagination. Let's get you back on track.
        </p>

        <div
          className="fade-in slide-in-from-bottom-2 mt-10 flex animate-in flex-col gap-3 fill-mode-both sm:flex-row"
          style={{ animationDelay: "300ms" }}
        >
          <Button
            size="lg"
            nativeButton={false}
            className="transition-all duration-200 hover:scale-[1.03]"
            render={<Link href={primary.href} />}
          >
            <HugeiconsIcon icon={primary.icon} data-icon="inline-start" />
            {primary.label}
          </Button>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            className="transition-all duration-200 hover:scale-[1.03] hover:border-sky-600 hover:bg-sky-600 hover:text-white dark:hover:bg-sky-600"
            render={<Link href="/" />}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} data-icon="inline-start" />
            Back to home
          </Button>
        </div>
      </div>
    </main>
  )
}
