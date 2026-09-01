import { Skeleton } from "@/components/ui/skeleton"

const CARDS = [0, 1, 2]

/**
 * Mirrors PromptCard's chrome exactly — colour rail, header row, editor
 * block, action row — so nothing moves when the real prompts arrive
 * (RULES.md: no layout dance between loading and loaded).
 */
export function PromptsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {CARDS.map((card) => (
        <article key={card} className="flex overflow-hidden rounded-lg border">
          <div className="w-1 shrink-0 bg-border" aria-hidden />
          <div className="flex min-w-0 flex-1 flex-col gap-4 p-5">
            <header className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-28 rounded-full" />
                <Skeleton className="h-5 w-10 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full max-w-prose" />
            </header>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-40 w-full rounded-md" />
              <Skeleton className="h-3.5 w-72" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-24 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
