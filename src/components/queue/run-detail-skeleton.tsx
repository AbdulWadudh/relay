import { Skeleton } from "@/components/ui/skeleton"

const STAGES = [0, 1, 2, 3, 4]
const FACTS = [0, 1, 2, 3]

function SectionShell({
  children,
}: React.PropsWithChildren<Record<never, never>>) {
  return (
    <section className="flex flex-col gap-3">
      {/* The section label is static copy, so it renders immediately rather
          than as a placeholder (RULES.md: loaders cover dynamic values). */}
      <Skeleton className="h-3 w-20" />
      {children}
    </section>
  )
}

/**
 * Streaming fallback for the run detail page. Mirrors RunDetail's chrome
 * exactly — same header stack, same bordered section blocks, same stage
 * rail — so only the contents swap in and nothing moves (RULES.md: no
 * layout dance between loading and loaded).
 */
export function RunDetailSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
        <Skeleton className="h-8 w-full max-w-md" />
        <Skeleton className="h-3.5 w-full max-w-sm" />
      </header>

      <SectionShell>
        <div className="rounded-lg border p-5">
          <ol className="flex flex-col">
            {STAGES.map((stage) => (
              <li key={stage} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <Skeleton className="size-6 rounded-full" />
                  {stage === STAGES.length - 1 ? null : (
                    <span className="w-px flex-1 bg-border" />
                  )}
                </div>
                <div className={stage === STAGES.length - 1 ? "pb-0" : "pb-5"}>
                  <Skeleton className="h-4 w-28" />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </SectionShell>

      <SectionShell>
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map((panel) => (
            <div key={panel} className="rounded-lg border">
              <div className="border-b px-4 py-3">
                <Skeleton className="h-4 w-36" />
              </div>
              <div className="flex flex-col gap-2 px-4 py-3">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-11/12" />
                <Skeleton className="h-3.5 w-9/12" />
              </div>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell>
        <div className="rounded-lg border p-5">
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {FACTS.map((fact) => (
              <div key={fact} className="flex flex-col gap-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
      </SectionShell>
    </div>
  )
}
