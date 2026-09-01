"use client"

import { Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useDeleteRun } from "@/lib/query/runs"

export function DeleteRun({ runId, label }: { runId: string; label: string }) {
  const deleteRun = useDeleteRun()

  function remove() {
    deleteRun.mutate(runId, {
      onSuccess: () => toast.add({ type: "success", title: "Run removed" }),
      onError: () =>
        toast.add({ type: "error", title: "Could not remove the run" }),
    })
  }

  return (
    <AlertDialog>
      <Tooltip>
        <TooltipTrigger
          render={
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="transition-all duration-200 hover:-translate-y-px hover:bg-red-600 hover:text-white dark:hover:bg-red-600"
                  aria-label={`Remove run for ${label}`}
                />
              }
            />
          }
        >
          {deleteRun.isPending ? (
            <Spinner />
          ) : (
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.5} />
          )}
        </TooltipTrigger>
        <TooltipContent>Remove run</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this run?</AlertDialogTitle>
          <AlertDialogDescription>
            The run record and everything it captured — source metadata,
            timings, and results — are deleted permanently. Anything already
            published to a destination stays there.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={remove}
            className="bg-red-600 text-white hover:bg-red-700 dark:hover:bg-red-700"
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
