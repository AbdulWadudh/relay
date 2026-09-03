"use client"

import { Fragment, useState } from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

/**
 * The table-view twin every chart carries.
 *
 * Not optional decoration. Three light-mode series sit below 3:1 on the
 * card, and the documented relief for that is direct labels OR a table
 * view — so this is what makes those charts legal, as well as being the
 * screen-reader-clean equivalent of any chart on the page.
 *
 * THE TABLE MUST FIT THE VIEWPORT, not scroll sideways inside the card.
 * The Table primitive ships `whitespace-nowrap` and `px-4` on every cell,
 * which is right for the runs list and wrong here: five columns of times
 * and counts blow past 390px. Text columns wrap at spaces instead, on
 * tighter gutters and a smaller face below `sm`.
 *
 * `wrapAnywhere` IS OPT-IN PER COLUMN, and that is the whole point.
 * Setting `overflow-wrap: anywhere` on every cell also collapses each
 * column's min-content width, so the browser squeezes all of them and
 * breaks ordinary words mid-syllable — "Provid/er", "Transc/ription".
 * Only the columns that genuinely hold unbreakable tokens (a model id, an
 * email) opt in; they absorb the squeeze and every other column keeps its
 * words whole.
 *
 * `secondary` columns FOLD RATHER THAN DISAPPEAR. Past four columns even
 * wrapping is not enough, so below `collapseBelow` the secondary ones move
 * into a per-row disclosure instead of being dropped. Every value stays
 * reachable on a phone, which is the entire reason the table view exists —
 * hiding columns outright would quietly delete the data it is there to
 * expose.
 *
 * THE ROW IS THE CONTROL, not a chevron in a column of its own. A toggle
 * column costs ~40px of a 390px table and it came straight out of the
 * narrowest text column, wrapping "39 min. ago" onto three lines. `row`
 * takes `aria-expanded`, so the row carries the state, a tabindex and an
 * Enter/Space handler, and every pixel goes to data.
 */

/** Literal class strings, so Tailwind can see them. A template assembled
 *  from the prop would never be scanned into the stylesheet. */
const COLLAPSE = {
  sm: {
    cell: "hidden sm:table-cell",
    only: "sm:hidden",
    notOnly: "sm:cursor-default sm:hover:bg-transparent",
  },
  md: {
    cell: "hidden md:table-cell",
    only: "md:hidden",
    notOnly: "md:cursor-default md:hover:bg-transparent",
  },
  lg: {
    cell: "hidden lg:table-cell",
    only: "lg:hidden",
    notOnly: "lg:cursor-default lg:hover:bg-transparent",
  },
} as const

export interface ChartTableColumn<Row> {
  key: string
  header: string
  /** Right-aligned tabular figures. Text columns stay left. */
  numeric?: boolean
  /** Allows breaking INSIDE a word. Only for columns holding unbreakable
   *  tokens — a model id, an email — never for prose. */
  wrapAnywhere?: boolean
  /** Folds into the row's disclosure below `collapseBelow`. */
  secondary?: boolean
  className?: string
  cell: (row: Row) => React.ReactNode
}

export function ChartTable<Row>({
  columns,
  rows,
  rowKey,
  collapseBelow,
}: {
  columns: ChartTableColumn<Row>[]
  rows: Row[]
  rowKey: (row: Row, index: number) => string
  collapseBelow?: keyof typeof COLLAPSE
}) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())

  const bp = collapseBelow ? COLLAPSE[collapseBelow] : null
  const folded = bp ? columns.filter((column) => column.secondary) : []
  const collapsible = folded.length > 0

  const toggle = (key: string) =>
    setOpen((current) => {
      const next = new Set(current)
      if (!next.delete(key)) next.add(key)
      return next
    })

  // No max-height and no overflow: the card grows and the page's single
  // scroller handles it.
  return (
    <div className="rounded-md border">
      <Table className="text-xs sm:text-sm">
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  "px-2 sm:px-4",
                  column.numeric ? "text-end" : "whitespace-normal",
                  column.secondary && bp?.cell,
                  column.className,
                )}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const key = rowKey(row, index)
            const expanded = open.has(key)
            return (
              <Fragment key={key}>
                <TableRow
                  aria-expanded={collapsible ? expanded : undefined}
                  tabIndex={collapsible ? 0 : undefined}
                  onClick={collapsible ? () => toggle(key) : undefined}
                  onKeyDown={
                    collapsible
                      ? (event) => {
                          if (event.key !== "Enter" && event.key !== " ") return
                          event.preventDefault()
                          toggle(key)
                        }
                      : undefined
                  }
                  className={cn(
                    collapsible &&
                      cn(
                        "cursor-pointer transition-colors hover:bg-sky-50 dark:hover:bg-sky-950",
                        // Above the breakpoint nothing is folded, so the
                        // row must stop advertising itself as a control.
                        bp?.notOnly,
                      ),
                  )}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        "px-2 sm:px-4",
                        column.numeric
                          ? "text-end tabular-nums"
                          : "whitespace-normal",
                        column.wrapAnywhere && "[overflow-wrap:anywhere]",
                        column.secondary && bp?.cell,
                        column.className,
                      )}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
                {collapsible && expanded ? (
                  <TableRow className={bp?.only}>
                    <TableCell
                      colSpan={columns.length}
                      className="whitespace-normal bg-muted p-0"
                    >
                      {/* A start rule in the toggle's own accent ties the
                          disclosure to the row it belongs to. Labels and
                          values sit in one grid so the eye travels a few
                          pixels, not the width of the card. */}
                      {/* A two-column grid, not an inline run and not a
                          justified list. Dropping the labels made the
                          fields collide into one another; right-aligning
                          the values put a card's width between a label and
                          its value. Label then value, tight, is the one
                          arrangement that reads at a glance — and
                          ChartTable is generic, so it cannot know which
                          folded field is the record's identity and rank
                          them for you. */}
                      <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-2 border-sky-600 border-s-2 px-3 py-3">
                        {folded.map((column) => (
                          <Fragment key={column.key}>
                            <dt className="text-muted-foreground">
                              {column.header}
                            </dt>
                            <dd
                              className={cn(
                                "min-w-0 font-medium text-foreground",
                                column.numeric && "tabular-nums",
                                column.wrapAnywhere &&
                                  "[overflow-wrap:anywhere]",
                              )}
                            >
                              {column.cell(row)}
                            </dd>
                          </Fragment>
                        ))}
                      </dl>
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
