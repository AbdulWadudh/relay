import type { RunStatus } from "@/lib/db/schema"

// Type-only import, erased at compile time, so a client component can use
// this without pulling Drizzle and the libSQL driver into the bundle — the
// same constraint src/lib/run-status.ts documents.
export interface ExistingRun {
  id: string
  status: RunStatus
  createdAt: number
}
