"use client"

import {
  ArrowTurnBackwardIcon,
  CheckmarkCircle02Icon,
  FloppyDiskIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { type PromptSummary, useUpdatePrompt } from "@/lib/query/prompts"
import { cn } from "@/lib/utils"

/**
 * One editable pipeline prompt.
 *
 * These prompts are what the extraction stage actually sends, so the card
 * is deliberately unglamorous about state: it shows whether this is still
 * the shipped default or the user's own, which version it is on, and it
 * will not let a save go out silently. Unsaved work is always recoverable
 * with Revert rather than lost to a navigation.
 *
 * Solid accents only (RULES.md) — one per prompt, so the three are
 * distinguishable at a glance without colour carrying the only meaning.
 */

const ACCENT: Record<string, { bar: string; chip: string }> = {
  evidence_contract: {
    bar: "bg-emerald-600",
    chip: "bg-emerald-600 text-white",
  },
  agent_router: { bar: "bg-violet-600", chip: "bg-violet-600 text-white" },
  schema_synthesizer: {
    bar: "bg-fuchsia-600",
    chip: "bg-fuchsia-600 text-white",
  },
}

const FALLBACK = { bar: "bg-sky-600", chip: "bg-sky-600 text-white" }

export function PromptCard({ prompt }: { prompt: PromptSummary }) {
  const [draft, setDraft] = React.useState(prompt.content)
  const update = useUpdatePrompt()
  const accent = ACCENT[prompt.key] ?? FALLBACK

  // A save (or another tab's edit) replaces the cached row; the open
  // editor has to follow it rather than keep showing the old text.
  // Deliberately keyed on the saved content, so a user's in-flight typing
  // is only discarded when the server value actually moves.
  React.useEffect(() => {
    setDraft(prompt.content)
  }, [prompt.content])

  const dirty = draft.trim() !== prompt.content.trim()
  const empty = draft.trim().length === 0
  const edited = prompt.additionalData.edited === true

  function save() {
    update.mutate(
      { key: prompt.key, content: draft },
      {
        onSuccess: () =>
          toast.add({ type: "success", title: `${prompt.name} saved` }),
        onError: () =>
          toast.add({ type: "error", title: "Could not save the prompt" }),
      },
    )
  }

  return (
    <article className="flex overflow-hidden rounded-lg border">
      {/* Colour rail: identity at a glance, and it keeps the card from
          reading as one undifferentiated slab of text. */}
      <div className={cn("w-1 shrink-0", accent.bar)} aria-hidden />

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-5">
        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading font-semibold text-base">
              {prompt.name}
            </h2>
            <Badge className={cn("border-transparent", accent.chip)}>
              {prompt.key}
            </Badge>
            <Badge variant="outline" className="font-mono tabular-nums">
              v{prompt.version}
            </Badge>
            {edited ? (
              <Badge className="border-transparent bg-amber-600 text-white">
                Customised
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Default
              </Badge>
            )}
          </div>
          <p className="max-w-prose text-muted-foreground text-sm leading-relaxed">
            {prompt.description}
          </p>
        </header>

        <div className="flex flex-col gap-2">
          <label
            htmlFor={`prompt-${prompt.key}`}
            className="font-medium text-muted-foreground text-xs uppercase tracking-wider"
          >
            Prompt
          </label>
          <Textarea
            id={`prompt-${prompt.key}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            spellCheck={false}
            aria-invalid={empty}
            aria-describedby={`prompt-${prompt.key}-help`}
            // field-sizing-content grows with the text, so a long prompt is
            // never clipped into a fixed box.
            className="min-h-40 font-mono text-xs leading-relaxed"
          />
          <p
            id={`prompt-${prompt.key}-help`}
            className={cn(
              "text-xs",
              empty
                ? "text-red-700 dark:text-red-400"
                : "text-muted-foreground",
            )}
          >
            {empty
              ? "A prompt cannot be empty — the pipeline would fall back to the shipped default."
              : "Applies to the next run. Saving bumps the version and clears the cached copy."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={save}
            disabled={!dirty || empty || update.isPending}
            className="transition-all duration-200 hover:-translate-y-px"
          >
            {update.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <HugeiconsIcon
                icon={FloppyDiskIcon}
                data-icon="inline-start"
                strokeWidth={1.5}
              />
            )}
            {update.isPending ? "Saving" : "Save"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setDraft(prompt.content)}
            disabled={!dirty || update.isPending}
            className="transition-all duration-200 hover:-translate-y-px"
          >
            <HugeiconsIcon
              icon={ArrowTurnBackwardIcon}
              data-icon="inline-start"
              strokeWidth={1.5}
            />
            Revert
          </Button>
          {/* Reserved height, so the row does not jump when this appears. */}
          <span className="flex h-5 items-center gap-1.5 text-xs">
            {dirty ? (
              <span className="text-amber-700 dark:text-amber-400">
                Unsaved changes
              </span>
            ) : (
              <>
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  strokeWidth={2}
                  className="size-3.5 text-emerald-700 dark:text-emerald-400"
                  aria-hidden
                />
                <span className="text-muted-foreground">Saved</span>
              </>
            )}
          </span>
        </div>
      </div>
    </article>
  )
}
