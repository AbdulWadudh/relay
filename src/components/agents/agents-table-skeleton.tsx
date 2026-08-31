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
 * Streaming fallback for the agents list. Mirrors AgentsTable's chrome
 * (border, column headers, mobile card frame) exactly so only the row
 * contents swap in when the data arrives — the surrounding layout never
 * flickers.
 */
export function AgentsTableSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <QueryStatusBarSkeleton entity="agents" />

      <div className="flex flex-col gap-3 sm:hidden">
        {ROWS.map((row) => (
          <div key={row} className="rounded-lg border p-4">
            <div className="grid gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full max-w-56" />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-8 w-28" />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden rounded-lg border sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((row) => (
              <TableRow key={row}>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-full max-w-64" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Skeleton className="h-8 w-28" />
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
