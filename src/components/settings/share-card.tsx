"use client"

import { Share08Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import { useSaveShareAutoRun, useShareAutoRun } from "@/lib/query/settings"

export function ShareCard() {
  const { data: enabled, isPending } = useShareAutoRun()
  const save = useSaveShareAutoRun()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5 font-heading text-lg tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-md bg-sky-600 text-white">
            <HugeiconsIcon icon={Share08Icon} className="size-4" aria-hidden />
          </span>
          Sharing
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-between gap-6 rounded-md border border-border bg-muted px-4 py-3.5 transition-colors hover:border-sky-500">
          <div className="space-y-1">
            <Label
              htmlFor="share-auto-run"
              className="font-medium text-foreground text-sm"
            >
              Run shared links immediately
            </Label>
            <p className="text-muted-foreground text-sm leading-6">
              On, a link from the share sheet is queued the moment it arrives.
              Off, Relay shows it to you first and waits for you to press Run.
            </p>
          </div>
          <Switch
            id="share-auto-run"
            className="mt-1 shrink-0"
            checked={enabled ?? false}
            disabled={isPending}
            onCheckedChange={(next) =>
              save.mutate(next, {
                onError: () =>
                  toast.add({
                    type: "error",
                    title: "Couldn't save that setting",
                  }),
              })
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}
