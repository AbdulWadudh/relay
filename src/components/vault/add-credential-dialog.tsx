"use client"

import {
  Add01Icon,
  KeyIcon,
  PlugSocketIcon,
  UserSharingIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

import { Modal } from "@/components/modal"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ApiKeyForm,
  type ApiKeyFormState,
} from "@/components/vault/api-key-form"
import { ImportSessionDialog } from "@/components/vault/import-session-dialog"
import { RayProviderGrid } from "@/components/vault/ray-provider-grid"
import { SocialProviderGrid } from "@/components/vault/social-provider-grid"
import { cn } from "@/lib/utils"

/**
 * One "Add credential" action, split by credential TYPE.
 *
 * Three separate header buttons overflowed the header on a phone, and all
 * three produced a row in the same table with nothing saying why they
 * differed. The tabs are the `credentials.type` vocabulary itself (api_key
 * / oauth / cookie), so the dialog teaches the data model rather than
 * inventing a parallel one.
 *
 * Built on the app's own `Modal` shell rather than a raw DialogContent.
 * That is the whole fix for two earlier problems: the footer is a static
 * grid row, so it can never be pushed down by a tall tab or leave dead
 * space under a short one, and it is shared by every tab instead of living
 * inside the API-key panel where the other two had no way out but the X.
 */

/**
 * Tabs have different natural heights — the Ray grid is three rows, the
 * Account grid is one. The floor keeps the dialog from resizing as you
 * move between them. It sits on the SCROLLING BODY, so it can never add
 * space beneath the footer. Only from sm up: on a phone the grids are
 * single-column and a fixed floor would strand the short tab in whitespace.
 *
 * 29.5rem is measured, not guessed: it is the natural height of the tallest
 * tab (Ray, three rows of cards). Below it the dialog still grew by ~70px
 * when that tab opened.
 */
const BODY = "sm:min-h-[29.5rem]"

/**
 * The slide follows `data-activation-direction`, which Base UI sets to the
 * side the previous tab was on, so a panel enters from where you came from
 * instead of always the same way. Inactive panels are unmounted, so
 * `animate-in` re-fires on every switch. Off under prefers-reduced-motion.
 */
const PANEL = cn(
  "fade-in animate-in duration-200 motion-reduce:animate-none",
  "data-[activation-direction=left]:slide-in-from-left-2",
  "data-[activation-direction=right]:slide-in-from-right-2",
)

/** Lets the footer's button submit a form it does not contain. */
const API_KEY_FORM_ID = "add-api-key-form"

/**
 * Each tab gets its OWN solid accent when active — one grey box for all
 * three read as disabled chrome. The primitive uses a BARE `data-active`
 * (verified in the DOM, not `data-[state=active]`), and its
 * `dark:data-active:bg-input/30` would otherwise win in dark mode, so both
 * are set.
 *
 * Written out in full, never interpolated: Tailwind scans source text, so
 * a `bg-${colour}-600` would never be generated and the tab would come out
 * unstyled.
 */
const TAB_BASE = "flex-1 gap-2 transition-colors duration-200"

const TAB_ACCENT: Record<string, string> = {
  api_key:
    "data-active:bg-emerald-600 data-active:text-white dark:data-active:bg-emerald-600 dark:data-active:text-white",
  oauth:
    "data-active:bg-sky-600 data-active:text-white dark:data-active:bg-sky-600 dark:data-active:text-white",
  cookie:
    "data-active:bg-fuchsia-600 data-active:text-white dark:data-active:bg-fuchsia-600 dark:data-active:text-white",
}

function tabClass(value: string): string {
  return cn(TAB_BASE, TAB_ACCENT[value])
}

export function AddCredentialDialog({
  configuredIds,
}: {
  configuredIds: string[]
}) {
  const [open, setOpen] = React.useState(false)
  const [tab, setTab] = React.useState("api_key")
  const [connecting, setConnecting] = React.useState<string | null>(null)
  // Reported up so the shared footer can disable its own button. The form
  // still owns every field; only these two booleans travel.
  const [keyForm, setKeyForm] = React.useState<ApiKeyFormState>({
    canSubmit: false,
    pending: false,
  })

  return (
    <>
      <Modal
        open={open}
        onOpenChange={setOpen}
        size="lg"
        icon={Add01Icon}
        accent="emerald"
        title="Add a credential"
        subtitle="Encrypted with AES-256-GCM before it is stored, and never returned by the API."
        bodyClassName={BODY}
        trigger={
          <Button className="transition-all duration-200 hover:-translate-y-px">
            <HugeiconsIcon
              icon={Add01Icon}
              data-icon="inline-start"
              className="transition-transform duration-300 group-hover/button:rotate-90"
            />
            Add credential
          </Button>
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            {tab === "api_key" ? (
              <Button
                type="submit"
                form={API_KEY_FORM_ID}
                disabled={!keyForm.canSubmit || keyForm.pending}
              >
                {keyForm.pending ? <Spinner data-icon="inline-start" /> : null}
                Store key
              </Button>
            ) : null}
          </>
        }
      >
        <Tabs value={tab} onValueChange={(next) => setTab(String(next))}>
          <TabsList className="w-full">
            <TabsTrigger value="api_key" className={tabClass("api_key")}>
              <HugeiconsIcon icon={KeyIcon} className="size-4" />
              API key
            </TabsTrigger>
            <TabsTrigger value="oauth" className={tabClass("oauth")}>
              <HugeiconsIcon icon={PlugSocketIcon} className="size-4" />
              Ray
            </TabsTrigger>
            <TabsTrigger value="cookie" className={tabClass("cookie")}>
              <HugeiconsIcon icon={UserSharingIcon} className="size-4" />
              Account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api_key" className={cn("pt-4", PANEL)}>
            <ApiKeyForm
              formId={API_KEY_FORM_ID}
              onStateChange={setKeyForm}
              onStored={() => setOpen(false)}
            />
          </TabsContent>

          <TabsContent value="oauth" className={cn("pt-4", PANEL)}>
            <p className="pb-3 text-muted-foreground text-sm">
              A destination Relay publishes to. Connecting again adds another
              account rather than replacing one.
            </p>
            <RayProviderGrid configuredIds={configuredIds} />
          </TabsContent>

          <TabsContent value="cookie" className={cn("pt-4", PANEL)}>
            <p className="pb-3 text-muted-foreground text-sm">
              A source Relay reads from. You sign in on the platform's own page
              — Relay stores the session cookie, never your password.
            </p>
            <SocialProviderGrid
              onConnect={(id) => {
                setOpen(false)
                setConnecting(id)
              }}
            />
          </TabsContent>
        </Tabs>
      </Modal>

      {connecting ? (
        <ImportSessionDialog
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
