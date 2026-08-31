import { QueryStatusBarSkeleton } from "@/components/query-status"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const ROWS = [0, 1, 2, 3, 4]

/**
 * Streaming fallback for the runs list. Mirrors RunsTable's chrome exactly
 * — same status bar, border, column headers, two-line source cell and
 * mobile card frame — so only the row contents swap in when data arrives
 * and nothing shifts position (RULES.md: no layout dance while loading).
 */
export function RunsTableSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <QueryStatusBarSkeleton entity="runs" />

      <div className="flex flex-col gap-3 sm:hidden">
        {ROWS.map((row) => (
          <div key={row} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="grid gap-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-52" />
              </div>
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="size-8" />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden rounded-lg border sm:block">
        <Table className="min-w-[44rem] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead className="w-[8.5rem]">Status</TableHead>
              <TableHead className="w-20">Duration</TableHead>
              <TableHead className="hidden w-44 lg:table-cell">
                Submitted
              </TableHead>
              <TableHead className="w-24 text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((row) => (
              <TableRow key={row}>
                <TableCell>
                  {/* Two stacked lines, matching RunTitle's title + URL. */}
                  <div className="grid gap-1">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-24 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Skeleton className="size-8" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
