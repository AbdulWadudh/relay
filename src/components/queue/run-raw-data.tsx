"use client"

import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

/**
 * Everything the run stored, verbatim.
 *
 * The point of `additional_data` is that nothing generated during a run is
 * discarded, so the detail page has to expose the raw blob rather than only
 * the fields the UI happens to understand. It is collapsed by default
 * because `source_info` alone is ~60 keys.
 */
export function RunRawData({
  title,
  data,
  defaultOpen = false,
}: {
  title: string
  data: unknown
  defaultOpen?: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  const json = React.useMemo(() => JSON.stringify(data, null, 2), [data])
  const keyCount =
    data && typeof data === "object" ? Object.keys(data).length : 0

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-lg border px-4 text-start text-sm",
          "transition-colors duration-200 hover:bg-muted",
        )}
      >
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          strokeWidth={1.5}
          className={cn(
            "size-4 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
        <span className="font-medium">{title}</span>
        {keyCount > 0 ? (
          <span className="font-mono text-muted-foreground text-xs tabular-nums">
            {keyCount} keys
          </span>
        ) : null}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="mt-2 max-h-[28rem] overflow-auto rounded-lg border bg-muted p-4 font-mono text-xs leading-relaxed">
          {json}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  )
}
