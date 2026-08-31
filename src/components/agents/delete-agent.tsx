"use client"

import { Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useRouter } from "next/navigation"
import * as React from "react"

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

export function DeleteAgent({
  agentId,
  agentName,
}: {
  agentId: string
  agentName: string
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function remove() {
    setPending(true)
    try {
      const response = await fetch(`/api/v1/agents/${agentId}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      toast.add({ type: "success", title: `${agentName} removed` })
      router.refresh()
    } catch {
      toast.add({ type: "error", title: "Could not remove the agent" })
    } finally {
      setPending(false)
    }
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
          {pending ? (
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
            This agent's prompt and output schema are deleted permanently.
            Pipelines routed to it will need a replacement agent.
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
