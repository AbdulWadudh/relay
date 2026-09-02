"use client"

import type * as React from "react"

import { ScrollPanel, STICKY_TABLE_HEADER } from "@/components/scroll-panel"
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
 * The app's list table (RULES.md, "List pages").
 *
 * Every list — runs, agents, credentials — was repeating the same six
 * decisions: the bordered panel, the height behaviour, the sticky header
 * incantation, the row hover, and a column's width written once on the
 * `th` and again on the `td`. Three copies meant three chances to get one
 * of them subtly wrong, and the sticky header only existed on one of them.
 *
 * A column declares its width ONCE. `className` lands on both the header
 * cell and the body cell, so a `w-20` or a `hidden lg:table-cell` cannot
 * drift between them — the failure mode of the hand-written version, where
 * a column hidden in the header still rendered its cells and every row
 * below shifted one column left.
 */

export interface DataColumn<T> {
  /** Stable identity for the React key, and for reading the JSX. */
  id: string
  header: React.ReactNode
  /** Width and responsive visibility. Applied to the `th` AND the `td`. */
  className?: string
  /** Presentation for the body cell alone — type, colour, alignment. */
  cellClassName?: string
  cell: (row: T) => React.ReactNode
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  className,
  tableClassName,
}: {
  rows: readonly T[]
  columns: ReadonlyArray<DataColumn<T>>
  rowKey: (row: T) => string
  /** Responsive visibility for the panel itself, e.g. `hidden lg:flex`. */
  className?: string
  tableClassName?: string
}) {
  return (
    <ScrollPanel className={className}>
      <Table className={tableClassName}>
        <TableHeader className={STICKY_TABLE_HEADER}>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.id} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={rowKey(row)}
              className="transition-colors duration-200 hover:bg-muted"
            >
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  className={cn(column.className, column.cellClassName)}
                >
                  {column.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollPanel>
  )
}
