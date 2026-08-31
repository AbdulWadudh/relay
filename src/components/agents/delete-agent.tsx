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
import { useDeleteAgent } from "@/lib/query/agents"

export function DeleteAgent({
  agentId,
  agentName,
}: {
  agentId: string
  agentName: string
}) {
  const deleteAgent = useDeleteAgent()

  // The row is removed from the cache optimistically and restored if the
  // request fails, so the confirm dialog closes onto an updated list.
  function remove() {
    deleteAgent.mutate(agentId, {
      onSuccess: () =>
        toast.add({ type: "success", title: `${agentName} removed` }),
      onError: () =>
        toast.add({ type: "error", title: "Could not remove the agent" }),
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
                  className="transition-all duration-200 hover:scale-110 hover:bg-red-600 hover:text-white dark:hover:bg-red-600"
                  aria-label={`Remove ${agentName}`}
                />
              }
            />
          }
        >
          {deleteAgent.isPending ? (
            <Spinner />
          ) : (
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.5} />
          )}
        </TooltipTrigger>
        <TooltipContent>Remove {agentName}</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {agentName}?</AlertDialogTitle>
          <AlertDialogDescription>
            The agent and its extraction schema are deleted permanently.
            Pipelines referencing it will stop producing structured output.
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
