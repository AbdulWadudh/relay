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

export function DeleteCredential({
  credentialId,
  providerLabel,
}: {
  credentialId: string
  providerLabel: string
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function remove() {
    setPending(true)
    try {
      const response = await fetch(`/api/v1/credentials/${credentialId}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      toast.add({
        type: "success",
        title: `${providerLabel} credential removed`,
      })
      router.refresh()
    } catch {
      toast.add({ type: "error", title: "Could not remove the credential" })
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
                  aria-label={`Remove ${providerLabel} credential`}
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
        <TooltipContent>Remove {providerLabel}</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Remove {providerLabel} credential?
          </AlertDialogTitle>
          <AlertDialogDescription>
            The encrypted token is deleted permanently. Pipelines using this
            provider will stop working until a new key is added.
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
