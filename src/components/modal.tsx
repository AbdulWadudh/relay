"use client"

import { Cancel01Icon, FileEditIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * The app's modal shell.
 *
 * Composed over the ShadCN/Base UI `Dialog` primitive rather than
 * replacing it — `src/components/ui/**` is vendored and stays that way.
 *
 * The point of this component is the SCROLL CONTRACT: the header and the
 * footer are fixed and the body is the only thing that scrolls. The bare
 * `DialogContent` grows with its children, so a tall child (a JSON Schema
 * in the agent editor, for instance) pushes the action buttons off-screen
 * and the dialog becomes unusable. Here the popup is a three-row grid
 * capped at the viewport, and the middle row is the single designated
 * ScrollArea — the same pattern the app shell uses (RULES.md: never a raw
 * overflow-y-auto div).
 */

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full"

/**
 * Widths climb in real steps rather than by a few pixels, so picking a
 * size is a meaningful choice. `full` is viewport-bound with a margin
 * kept on every side so the modal never looks welded to the screen edge.
 */
const SIZE: Record<ModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
  full: "sm:max-w-[min(96rem,calc(100vw-4rem))]",
}

/** Solid tile behind the header icon (RULES.md: solid colours, no glass). */
export type ModalAccent =
  | "emerald"
  | "violet"
  | "sky"
  | "amber"
  | "fuchsia"
  | "red"

const ACCENT: Record<ModalAccent, string> = {
  emerald: "bg-emerald-600 text-white",
  violet: "bg-violet-600 text-white",
  sky: "bg-sky-600 text-white",
  amber: "bg-amber-600 text-white",
  fuchsia: "bg-fuchsia-600 text-white",
  red: "bg-red-600 text-white",
}

export interface ModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  triggerTooltip?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  icon?: typeof FileEditIcon
  accent?: ModalAccent
  size?: ModalSize
  footer?: React.ReactNode
  bodyClassName?: string
  className?: string
  children: React.ReactNode
}

export function Modal({
  open,
  onOpenChange,
  trigger,
  triggerTooltip,
  title,
  subtitle,
  icon = FileEditIcon,
  accent = "emerald",
  size = "md",
  footer,
  bodyClassName,
  className,
  children,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && triggerTooltip ? (
        <Tooltip>
          <TooltipTrigger
            render={<DialogTrigger render={trigger as never} />}
          />
          <TooltipContent>{triggerTooltip}</TooltipContent>
        </Tooltip>
      ) : trigger ? (
        <DialogTrigger render={trigger as never} />
      ) : null}
      <DialogContent
        showCloseButton={false}
        className={cn(
          "grid gap-0 overflow-hidden p-0",
          "grid-rows-[auto_minmax(0,1fr)_auto]",
          "max-h-[calc(100svh-2rem)] sm:max-h-[calc(100svh-4rem)]",
          size === "full" && "h-[calc(100svh-2rem)] sm:h-[calc(100svh-4rem)]",
          SIZE[size],
          className,
        )}
      >
        <header className="flex items-center gap-3 border-b px-6 py-4">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              ACCENT[accent],
            )}
          >
            <HugeiconsIcon
              icon={icon}
              strokeWidth={1.5}
              className="size-5"
              aria-hidden
            />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <DialogTitle className="text-base leading-tight">
              {title}
            </DialogTitle>
            {subtitle ? (
              <DialogDescription className="text-sm leading-snug">
                {subtitle}
              </DialogDescription>
            ) : null}
          </div>
          <DialogClose
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Close"
                className="-me-2 shrink-0 transition-all duration-200 hover:-translate-y-px hover:bg-red-600 hover:text-white dark:hover:bg-red-600"
              />
            }
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
          </DialogClose>
        </header>

        <ScrollArea className="min-h-0">
          <div className={cn("px-6 py-4", bodyClassName)}>{children}</div>
        </ScrollArea>

        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-3 border-t px-6 py-4">
            {footer}
          </footer>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
