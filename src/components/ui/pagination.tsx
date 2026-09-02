import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
  MoreHorizontalIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import type * as React from "react"

import { type Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * ShadCN `pagination`, vendored to match this codebase: HugeIcons instead
 * of Lucide, and the local `buttonVariants` so a page link is the same
 * height and radius as every other control.
 *
 * Deliberately link-based rather than button-based. The page lives in the
 * URL, so each control is a real anchor a user can middle-click, copy or
 * bookmark, and the browser's back button walks the pages.
 */

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  )
}

function PaginationItem(props: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
  /**
   * Absent means "this direction does not exist" — first page, last page.
   * Rendered as a inert `<span>` rather than omitted, so the control keeps
   * its slot and the row does not change width as you page.
   */
  href?: string
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  Omit<React.ComponentProps<"a">, "href">

function PaginationLink({
  className,
  isActive,
  href,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  const classes = cn(
    buttonVariants({ variant: isActive ? "outline" : "ghost", size }),
    "transition-all duration-200",
    href
      ? "hover:-translate-y-px hover:bg-amber-600 hover:text-white dark:hover:bg-amber-600"
      : "pointer-events-none opacity-40",
    className,
  )

  if (!href) {
    return (
      <span
        aria-disabled
        data-slot="pagination-link"
        className={classes}
        {...props}
      />
    )
  }

  return (
    <Link
      // The current page is the one landmark in the row; `aria-current` is
      // what a screen reader announces it by, and the outline variant is
      // what everyone else sees.
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      href={href}
      className={classes}
      {...props}
    />
  )
}

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("gap-1 px-2.5 sm:ps-2.5", className)}
      {...props}
    >
      <HugeiconsIcon icon={ArrowLeft02Icon} size={16} strokeWidth={2} />
      <span className="hidden sm:block">Previous</span>
    </PaginationLink>
  )
}

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pe-2.5", className)}
      {...props}
    >
      <span className="hidden sm:block">Next</span>
      <HugeiconsIcon icon={ArrowRight02Icon} size={16} strokeWidth={2} />
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <HugeiconsIcon
        icon={MoreHorizontalIcon}
        size={16}
        strokeWidth={2}
        className="text-muted-foreground"
      />
      <span className="sr-only">More pages</span>
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
