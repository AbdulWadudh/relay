"use client"

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

/**
 * The runs pager. The page lives in the URL (`/runs?page=3`), which is what
 * makes it shareable, back-button-able, and prefetchable on the server —
 * component state could do none of those.
 *
 * Rendered only when there is more than one page: a pager under a
 * three-row table is furniture, not information.
 */

/**
 * Page numbers to show, with `null` standing for a gap.
 *
 * Windowed rather than listing everything, because a few hundred runs is a
 * realistic amount and 15 page buttons is not a navigation aid. First and
 * last are always present so the ends of the range stay one click away,
 * and the window around the current page keeps its neighbours reachable.
 */
export type PageSlot = number | "gap-start" | "gap-end"

export function pageWindow(current: number, total: number): PageSlot[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const around = [current - 1, current, current + 1].filter(
    (page) => page > 1 && page < total,
  )
  // `Set` because the window collides with the fixed ends near either edge
  // — at page 2 the window already contains 1.
  const pages = [...new Set([1, ...around, total])].sort((a, b) => a - b)

  // Named gaps rather than a repeated `null`: there are at most two, one
  // at each end, so naming them gives every slot a stable React key
  // without falling back to the array index.
  const out: PageSlot[] = []
  let previous = 0
  for (const page of pages) {
    // The gap just before the last page is the trailing one; any other is
    // the leading one. At most one of each, so both keys stay unique.
    if (page - previous > 1) out.push(page === total ? "gap-end" : "gap-start")
    out.push(page)
    previous = page
  }
  return out
}

export function RunsPagination({
  page,
  total,
  perPage,
}: {
  page: number
  total: number
  perPage: number
}) {
  const pages = Math.max(1, Math.ceil(total / perPage))
  if (pages <= 1) return null

  // Page 1 is the bare `/runs`, not `/runs?page=1`: one canonical URL for
  // the default view rather than two that render identically.
  const href = (target: number) =>
    target <= 1 ? "/runs" : `/runs?page=${target}`

  const first = (page - 1) * perPage + 1
  const last = Math.min(page * perPage, total)

  return (
    <div className="flex flex-col items-center gap-2 pt-2 sm:flex-row sm:justify-between">
      <p className="text-muted-foreground text-xs">
        {/* Counts, not just page numbers: "41-60 of 137" answers "how much
            is there" in a way "page 3 of 7" does not. */}
        Showing <span className="font-medium text-foreground">{first}</span>–
        <span className="font-medium text-foreground">{last}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span> runs
      </p>
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            {/* No href at the ends: the control renders inert rather than
                disappearing, so the row does not change width as you page
                and the buttons stay where the cursor left them. */}
            <PaginationPrevious href={page > 1 ? href(page - 1) : undefined} />
          </PaginationItem>

          {pageWindow(page, pages).map((target) =>
            typeof target === "string" ? (
              <PaginationItem key={target}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={target}>
                <PaginationLink isActive={target === page} href={href(target)}>
                  {target}
                </PaginationLink>
              </PaginationItem>
            ),
          )}

          <PaginationItem>
            <PaginationNext href={page < pages ? href(page + 1) : undefined} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
