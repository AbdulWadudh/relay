"use client"

import type { Add01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * A row action that exists but cannot be used. Keeps the action column
 * uniform and explains the reason in its tooltip.
 */
export function DisabledActionSlot({
  icon,
  label,
  reason,
}: {
  icon: typeof Add01Icon
  label: string
  reason: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            // aria-disabled, not disabled: keeps it focusable so the
            // tooltip explaining why stays reachable.
            aria-disabled
            onClick={(event) => event.preventDefault()}
            className="cursor-not-allowed opacity-40"
          />
        }
      >
        <HugeiconsIcon icon={icon} strokeWidth={1.5} />
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  )
}
