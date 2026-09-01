"use client"

import { PromptCard } from "@/components/prompts/prompt-card"
import { PromptsSkeleton } from "@/components/prompts/prompts-skeleton"
import { QueryErrorState } from "@/components/query-error"
import { usePrompts } from "@/lib/query/prompts"

/**
 * The pipeline's own prompts. There is no create or delete — the set is
 * fixed by what the extraction stage calls — so this is a list of editors
 * rather than a CRUD table, and it needs no empty state: the API seeds the
 * defaults before returning.
 */
export function PromptsList() {
  const { data: prompts, isPending, isError, error, refetch } = usePrompts()

  if (isPending) return <PromptsSkeleton />
  if (isError && !prompts) {
    return (
      <QueryErrorState
        entity="prompt"
        error={error}
        onRetry={() => refetch()}
      />
    )
  }
  if (!prompts) return null

  return (
    <div className="flex flex-col gap-4">
      {prompts.map((prompt) => (
        <PromptCard key={prompt.id} prompt={prompt} />
      ))}
    </div>
  )
}
