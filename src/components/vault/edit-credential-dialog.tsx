"use client"

import { PencilEdit02Icon } from "@hugeicons/core-free-icons"
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
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { providerLabel } from "@/lib/providers"
import { useUpdateCredential } from "@/lib/query/credentials"
import type { MaskedCredential } from "@/lib/vault"

/** Existing account label, read from the generic meta key. */
function currentAccount(credential: MaskedCredential): string {
  const value = credential.metaData?.account_name
  return typeof value === "string" ? value : ""
}

/**
 * Rename a credential and, for API keys, record the issuing account and
 * rotate the secret.
 *
 * Account and secret are offered for API keys only. An OAuth row gets its
 * `account_name` from the provider on every reconnect, so a hand-typed
 * value there would silently be overwritten; and its token only has
 * meaning alongside the refresh token and metadata the flow issued with
 * it, so those rows are re-authorised through Reconnect instead.
 */
export function EditCredentialDialog({
  credential,
}: {
  credential: MaskedCredential
}) {
  const [open, setOpen] = React.useState(false)
  const [label, setLabel] = React.useState(credential.label ?? "")
  const [account, setAccount] = React.useState(currentAccount(credential))
  const [secret, setSecret] = React.useState("")
  const update = useUpdateCredential()

  const name = credential.label ?? providerLabel(credential.provider)
  const canRotate = credential.type === "api_key"

  function reset() {
    setLabel(credential.label ?? "")
    setAccount(currentAccount(credential))
    setSecret("")
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const input: { label?: string; account?: string; accessToken?: string } = {}
    if (label !== (credential.label ?? "")) input.label = label
    // The account is only ours to set on API keys; OAuth rows get theirs
    // from the provider on every reconnect.
    if (canRotate && account !== currentAccount(credential)) {
      input.account = account
    }
    if (canRotate && secret.trim().length > 0) input.accessToken = secret.trim()

    if (Object.keys(input).length === 0) {
      setOpen(false)
      return
    }

    update.mutate(
      { id: credential.id, input },
      {
        onSuccess: () => {
          setOpen(false)
          setSecret("")
          toast.add({
            type: "success",
            title: input.accessToken ? "Secret rotated" : "Credential updated",
          })
        },
        onError: () =>
          toast.add({ type: "error", title: "Could not save changes" }),
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${name}`}
                  className="transition-all duration-200 hover:scale-110 hover:bg-violet-600 hover:text-white dark:hover:bg-violet-600"
                />
              }
            />
          }
        >
          <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={1.5} />
        </TooltipTrigger>
        <TooltipContent>Rename or rotate</TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Edit {name}</DialogTitle>
            <DialogDescription>
              Give this credential a name you will recognise
              {canRotate
                ? ", record which account issued it, or replace the stored secret."
                : "."}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-6">
            <Field>
              <FieldLabel htmlFor="credential-label">Name</FieldLabel>
              <Input
                id="credential-label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder={providerLabel(credential.provider)}
                maxLength={80}
                autoComplete="off"
              />
              <FieldDescription>
                Leave empty to fall back to the provider name.
              </FieldDescription>
            </Field>

            {canRotate ? (
              <Field>
                <FieldLabel htmlFor="credential-account">Account</FieldLabel>
                <Input
                  id="credential-account"
                  value={account}
                  onChange={(event) => setAccount(event.target.value)}
                  placeholder="e.g. abdul@example.com"
                  maxLength={120}
                  autoComplete="off"
                />
                <FieldDescription>
                  Which account this key was generated from. Shown in the
                  Account column.
                </FieldDescription>
              </Field>
            ) : null}

            {canRotate ? (
              <Field>
                <FieldLabel htmlFor="credential-secret">New secret</FieldLabel>
                <Input
                  id="credential-secret"
                  type="password"
                  value={secret}
                  onChange={(event) => setSecret(event.target.value)}
                  placeholder="Leave empty to keep the current one"
                  autoComplete="off"
                />
                <FieldDescription>
                  Re-encrypted with a fresh initialisation vector.
                </FieldDescription>
              </Field>
            ) : null}
          </FieldGroup>

          <DialogFooter>
            <Button
              type="submit"
              disabled={update.isPending}
              className="transition-all duration-200 hover:scale-[1.03]"
            >
              {update.isPending ? <Spinner /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
