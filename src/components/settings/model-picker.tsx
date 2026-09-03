"use client"

import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import type { AccountModels } from "@/lib/extraction/model-choice"
import type { ChatStage } from "@/lib/extraction/stages"
import { usePinModel } from "@/lib/query/settings"
import { cn } from "@/lib/utils"

/**
 * The model one account will use, and a way to change it.
 *
 * The chip is the answer to "which model does it use", which was
 * previously only visible after a run had already finished. The list is
 * the provider's own catalog, ranked exactly as the pipeline ranks it, so
 * the top entry is what "Auto" resolves to.
 *
 * `onPointerDown` stops here: this sits inside a row that dnd-kit has made
 * draggable, and without it opening the menu registers as a drag.
 */

const MAX_LISTED = 24

function contextLabel(tokens: number): string | null {
  if (!tokens || tokens <= 0) return null
  return `${Math.round(tokens / 1000)}k`
}

export function ModelPicker({
  stage,
  account,
  loading = false,
}: {
  stage: ChatStage
  /** Absent while the provider's catalog is still being read. */
  account: AccountModels | undefined
  loading?: boolean
}) {
  const pin = usePinModel()
  const stopDrag = (event: React.PointerEvent) => event.stopPropagation()

  if (!account) {
    return loading ? (
      <Skeleton className="h-7 w-24 shrink-0 rounded-md sm:w-32" />
    ) : (
      <span className="w-24 shrink-0 sm:w-32" />
    )
  }

  if (account.unavailable) {
    return (
      <span className="shrink-0 font-mono text-muted-foreground text-xs">
        {account.unavailable}
      </span>
    )
  }

  const label = account.using ?? "none eligible"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            onPointerDown={stopDrag}
            disabled={pin.isPending || account.models.length === 0}
            className={cn(
              "h-7 max-w-36 shrink-0 gap-1 px-2 font-mono text-xs sm:max-w-[14rem]",
              "transition-colors duration-200 hover:bg-muted",
              account.pinned ? "text-foreground" : "text-muted-foreground",
            )}
            aria-label={`Model for ${account.provider}: ${label}`}
          />
        }
      >
        {pin.isPending ? <Spinner className="size-3 shrink-0" /> : null}
        <span className="truncate">{label}</span>
        {account.models.length > 0 && !pin.isPending ? (
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            className="size-3 shrink-0"
            strokeWidth={2}
          />
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="max-h-80 w-72 overflow-y-auto"
      >
        <DropdownMenuItem
          onClick={() =>
            pin.mutate(
              { stage, entryId: account.entryId, model: null },
              {
                onError: () =>
                  toast.add({ type: "error", title: "Could not change model" }),
              },
            )
          }
        >
          <span className="flex w-4 shrink-0 justify-center">
            {account.pinned === null ? (
              <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />
            ) : null}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm">Auto</span>
            <span className="block truncate font-mono text-muted-foreground text-xs">
              {account.models[0]?.id ?? "nothing eligible"}
            </span>
          </span>
        </DropdownMenuItem>

        {account.models.slice(0, MAX_LISTED).map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() =>
              pin.mutate(
                { stage, entryId: account.entryId, model: model.id },
                {
                  onError: () =>
                    toast.add({
                      type: "error",
                      title: "Could not change model",
                    }),
                },
              )
            }
          >
            <span className="flex w-4 shrink-0 justify-center">
              {account.pinned === model.id ? (
                <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />
              ) : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-xs">
                {model.id}
              </span>
              <span className="flex gap-1 pt-0.5">
                {model.free ? (
                  <Badge className="border-transparent bg-emerald-600 px-1 py-0 text-[10px] text-white">
                    free
                  </Badge>
                ) : null}
                {model.vision ? (
                  <Badge className="border-transparent bg-sky-600 px-1 py-0 text-[10px] text-white">
                    vision
                  </Badge>
                ) : null}
                {contextLabel(model.contextLength) ? (
                  <Badge
                    variant="outline"
                    className="px-1 py-0 text-[10px] text-muted-foreground"
                  >
                    {contextLabel(model.contextLength)}
                  </Badge>
                ) : null}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
