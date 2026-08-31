import { Compass01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"

import { ShellContent, ShellHeader } from "@/components/app-shell"
import { Button } from "@/components/ui/button"

/**
 * Shared by `(dashboard)/not-found.tsx` (generic fallback) and the
 * `[...catchAll]` page (section-aware: title is the requested route,
 * Title Cased). Always renders inside the authenticated shell — the sidebar
 * never disappears for a signed-in user hitting an unknown route.
 *
 * No card/border wrapper — a full-panel radial gradient smeared badly in
 * light mode, and a bordered box read as a stray square. The glow now lives
 * only inside the icon badge (`overflow-hidden`, fixed size), so it can't
 * bleed past its own bounds in either theme.
 */
export function DashboardNotFoundPanel({ title }: { title: string }) {
  return (
    <>
      <ShellHeader title={title} />
      <ShellContent>
        <div className="fade-in zoom-in-95 flex min-h-[70svh] animate-in flex-col items-center justify-center fill-mode-both">
          <div
            className="mb-8 flex size-20 items-center justify-center rounded-2xl bg-emerald-600"
            style={{ animationDelay: "60ms" }}
          >
            <HugeiconsIcon
              icon={Compass01Icon}
              strokeWidth={1.5}
              className="size-10 text-white"
            />
          </div>

          <p
            className="fade-in slide-in-from-bottom-2 animate-in select-none fill-mode-both font-mono text-6xl text-muted-foreground/25 tracking-tight sm:text-7xl"
            style={{ animationDelay: "120ms" }}
          >
            404
          </p>
          <h2
            className="fade-in slide-in-from-bottom-2 -mt-5 animate-in fill-mode-both text-center font-heading font-semibold text-2xl tracking-tight sm:text-3xl"
            style={{ animationDelay: "180ms" }}
          >
            This route wandered off the map
          </h2>
          <p
            className="fade-in slide-in-from-bottom-2 mt-3 max-w-sm animate-in text-balance fill-mode-both text-center text-muted-foreground text-sm"
            style={{ animationDelay: "240ms" }}
          >
            The page you're looking for doesn't exist, moved, or hasn't shipped
            yet. Your workspace is still right where you left it.
          </p>

          <div
            className="fade-in slide-in-from-bottom-2 mt-8 animate-in fill-mode-both"
            style={{ animationDelay: "300ms" }}
          >
            <Button
              size="lg"
              nativeButton={false}
              className="transition-all duration-200 hover:scale-[1.03]"
              render={<Link href="/runs" />}
            >
              Back to your vault
            </Button>
          </div>
          <p
            className="fade-in slide-in-from-bottom-2 mt-4 animate-in fill-mode-both text-center text-muted-foreground text-xs"
            style={{ animationDelay: "340ms" }}
          >
            Or pick up where you left off from the sidebar.
          </p>
        </div>
      </ShellContent>
    </>
  )
}
