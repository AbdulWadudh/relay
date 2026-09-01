"use client"

import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

import { JsonView } from "@/components/json-view"
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
 *
 * Rendered through the shared JSON surface rather than a `<pre>` dump:
 * with a transcript inside it, this blob runs to hundreds of lines, and
 * scrolling a wall of text to find one key is not reading. Nodes collapse
 * and the filter narrows to matching keys or values.
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
        {/* JsonView owns its own border, toolbar and capped scroll, so a
            transcript cannot push the rest of the page out of reach. */}
        <div className="mt-2">
          <JsonView data={data} filterLabel={`Filter ${title}`} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
