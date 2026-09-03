"use client"

import { Alert02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"
import {
  type ClaimFinding,
  findingEvidence,
  REASON_TEXT,
} from "@/components/queue/claim-finding"
import { type ExtractedItem, readFields } from "@/lib/extraction/shape"
import { cn } from "@/lib/utils"

/**
 * The agent's output, rendered as content rather than as JSON.
 *
 * Schema-agnostic on purpose (see src/lib/extraction/shape.ts): the fields come
 * from whichever agent ran, so this component renders whatever structure
 * the schema produced, instead of naming fields it cannot know.
 *
 * Claims the grounding check could not support are marked inline; the
 * counts live in the Evidence panel above.
 */

function FlagNotice({ finding }: { finding: ClaimFinding }) {
  const evidence = findingEvidence(finding)

  return (
    <div className="flex gap-1.5 text-xs">
      <HugeiconsIcon
        icon={Alert02Icon}
        strokeWidth={2}
        className="mt-0.5 size-3.5 shrink-0 text-amber-700 dark:text-amber-400"
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-amber-700 dark:text-amber-400">
          {REASON_TEXT[finding.reason ?? ""] ?? "Could not be verified"}
        </p>
        {/* The reason states a verdict; this is what it was based on, so a
            reader can disagree with it. Muted, because it is the detail
            behind the claim rather than the claim itself. */}
        {evidence ? (
          <p className="wrap-break-word text-muted-foreground">{evidence}</p>
        ) : null}
      </div>
    </div>
  )
}

function Item({
  item,
  index,
  finding,
}: {
  item: ExtractedItem
  index?: number
  finding?: ClaimFinding
}) {
  const flagged = finding !== undefined && finding.status !== "verified"
  return (
    <li className="flex min-w-0 gap-3">
      {index === undefined ? null : (
        <span className="mt-0.5 w-5 shrink-0 text-right font-mono text-muted-foreground text-xs tabular-nums">
          {index + 1}
        </span>
      )}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-1",
          // A flagged claim is kept, not removed, so it needs to be
          // unmistakable in the reading flow rather than a subtle tint.
          flagged && "border-amber-600 border-s-2 ps-3",
        )}
      >
        <p className="text-sm leading-relaxed [overflow-wrap:anywhere]">
          {item.text}
        </p>
        {flagged && finding ? <FlagNotice finding={finding} /> : null}
        {item.extras.length > 0 ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {item.extras.map((extra) => (
              <span
                key={extra.label}
                className="text-muted-foreground text-xs [overflow-wrap:anywhere]"
              >
                <span className="opacity-70">{extra.label}: </span>
                {extra.value}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </li>
  )
}

export function RunExtraction({
  data,
  agentName,
  routingReason,
  findings = [],
}: {
  data: Record<string, unknown>
  agentName: string | null
  routingReason: string | null
  findings?: Record<string, unknown>[]
}) {
  const fields = React.useMemo(() => readFields(data), [data])
  const byPointer = React.useMemo(() => {
    const map = new Map<string, ClaimFinding>()
    for (const raw of findings) {
      if (typeof raw?.pointer !== "string") continue
      map.set(raw.pointer, raw as unknown as ClaimFinding)
    }
    return map
  }, [findings])
  if (fields.length === 0) return null

  return (
    <div className="flex flex-col gap-6 rounded-lg border p-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b pb-4">
        <span className="font-medium text-sm">{agentName ?? "Extraction"}</span>
        <span className="font-mono text-muted-foreground text-xs tabular-nums">
          {fields.length} field{fields.length === 1 ? "" : "s"}
        </span>
        {routingReason ? (
          <p className="w-full text-muted-foreground text-xs [overflow-wrap:anywhere]">
            {routingReason}
          </p>
        ) : null}
      </div>

      {fields.map((field) => (
        <section key={field.key} className="flex min-w-0 flex-col gap-2">
          <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            {field.label}
          </h3>
          {field.scalar ? (
            <ul className="flex flex-col gap-2">
              <Item
                item={field.scalar}
                finding={byPointer.get(field.scalar.pointer)}
              />
            </ul>
          ) : null}
          {field.items ? (
            <ul className="flex flex-col gap-3">
              {field.items.map((item, index) => (
                <Item
                  key={item.id}
                  item={item}
                  finding={byPointer.get(item.pointer)}
                  index={
                    field.items && field.items.length > 1 ? index : undefined
                  }
                />
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  )
}
