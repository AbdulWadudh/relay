"use client"

import { Add01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApiKeyForm } from "@/components/vault/api-key-form"
import { ConnectSessionDialog } from "@/components/vault/connect-session-dialog"
import { RayProviderGrid } from "@/components/vault/ray-provider-grid"
import { SocialProviderGrid } from "@/components/vault/social-provider-grid"

/**
 * One "Add credential" action, split by credential TYPE.
 *
 * Three separate header buttons overflowed the header on a small screen —
 * and RULES.md treats mobile as first-class, not a later pass. Collapsing
 * them also removes a real ambiguity: "Add Ray", "Connect account" and
 * "Add API Key" all produced a row in the same table, and nothing said why
 * they were different things.
 *
 * The tabs are the `credentials.type` vocabulary itself (api_key / oauth /
 * cookie), so the dialog teaches the data model rather than inventing a
 * parallel one.
 */

export function AddCredentialDialog({
  configuredIds,
}: {
  configuredIds: string[]
}) {
  const [open, setOpen] = React.useState(false)
  const [connecting, setConnecting] = React.useState<string | null>(null)

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button className="transition-all duration-200 hover:-translate-y-px" />
          }
        >
          <HugeiconsIcon
            icon={Add01Icon}
            data-icon="inline-start"
            className="transition-transform duration-300 group-hover/button:rotate-90"
          />
          Add credential
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Add a credential</DialogTitle>
            <DialogDescription className="text-sm">
              Everything here is encrypted with AES-256-GCM before it is stored,
              and never returned by the API.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="api_key">
            <TabsList className="w-full">
              <TabsTrigger value="api_key" className="flex-1">
                API key
              </TabsTrigger>
              <TabsTrigger value="oauth" className="flex-1">
                Ray
              </TabsTrigger>
              <TabsTrigger value="cookie" className="flex-1">
                Account
              </TabsTrigger>
            </TabsList>

            <TabsContent value="api_key" className="pt-4">
              <ApiKeyForm onDone={() => setOpen(false)} />
            </TabsContent>

            <TabsContent value="oauth" className="pt-4">
              <p className="pb-3 text-muted-foreground text-sm">
                A destination Relay publishes to. Connecting again adds another
                account rather than replacing one.
              </p>
              <RayProviderGrid configuredIds={configuredIds} />
            </TabsContent>

            <TabsContent value="cookie" className="pt-4">
              <p className="pb-3 text-muted-foreground text-sm">
                A source Relay reads from. You sign in on the platform's own
                page — Relay stores the session cookie, never your password.
              </p>
              <SocialProviderGrid
                onConnect={(id) => {
                  setOpen(false)
                  setConnecting(id)
                }}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {connecting ? (
        <ConnectSessionDialog
          provider={connecting}
          open={true}
          onOpenChange={(next) => {
            if (!next) setConnecting(null)
          }}
        />
      ) : null}
    </>
  )
}
