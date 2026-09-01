"use client"

import { Add01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { SUPPORTED_SOURCE_LABELS } from "@/lib/media/sources"
import { useCreateRun } from "@/lib/query/runs"
import { relayProcessSchema } from "@/lib/schemas"

/**
 * Submits a video URL to the pipeline. Validates with the same Zod schema
 * the API uses, so the inline error and the server's rejection can't
 * disagree about what a supported link is.
 */
export function NewRunDialog({ full = false }: { full?: boolean }) {
  const [open, setOpen] = React.useState(false)
  const [url, setUrl] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const createRun = useCreateRun()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const parsed = relayProcessSchema.safeParse({ url })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a supported link.")
      return
    }
    setError(null)
    createRun.mutate(parsed.data, {
      onSuccess: () => {
        setOpen(false)
        setUrl("")
        toast.add({ type: "success", title: "Run queued" })
      },
      onError: (mutationError) =>
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : "Could not queue the run.",
        ),
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setUrl("")
          setError(null)
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            className={
              full
                ? "transition-all duration-200 hover:-translate-y-px"
                : "transition-all duration-200 hover:-translate-y-px hover:bg-amber-600 hover:text-white dark:hover:bg-amber-600"
            }
          />
        }
      >
        <HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
        New run
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Process a video</DialogTitle>
            <DialogDescription>
              Relay downloads the audio locally, transcribes it, and publishes
              the evidence-grounded result to your connected destination.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-6">
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="run-url">Video URL</FieldLabel>
              <Input
                id="run-url"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value)
                  if (error) setError(null)
                }}
                placeholder="https://www.youtube.com/shorts/…"
                autoComplete="off"
                aria-invalid={error ? true : undefined}
              />
              <FieldDescription>
                Public {SUPPORTED_SOURCE_LABELS} links.
              </FieldDescription>
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="submit"
              disabled={createRun.isPending}
              className="transition-all duration-200 hover:-translate-y-px"
            >
              {createRun.isPending ? <Spinner /> : null}
              Queue run
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
