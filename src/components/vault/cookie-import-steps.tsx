"use client"

import {
  Alert02Icon,
  Copy01Icon,
  LinkSquare02Icon,
  Login03Icon,
  PuzzleIcon,
  Shield01Icon,
  Tick02Icon,
  Upload04Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { providerLabel } from "@/lib/providers"
import type { SocialProvider } from "@/lib/social/providers"

/**
 * The four steps of the connect wizard, driven entirely by the registry
 * entry (SESSION_AUTH.md §2.4) — every provider-specific string comes from
 * `provider`, so this file never names a source.
 *
 * These steps ARE the feature. Relay no longer drives a browser, so an
 * export the user gets subtly wrong is the whole failure surface: the wrong
 * format, an export taken while signed out, or (on Google) one invalidated
 * by reopening the tab a second later. Each warning is attached to the step
 * where the mistake actually happens, not collected in a footnote.
 */

export const CONNECT_STEPS = [
  { id: "install", title: "Install", icon: PuzzleIcon },
  { id: "signin", title: "Sign in", icon: Login03Icon },
  { id: "export", title: "Export", icon: LinkSquare02Icon },
  { id: "upload", title: "Upload", icon: Upload04Icon },
] as const

const EXTENSION = {
  chromium:
    "https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc",
  firefox:
    "https://addons.mozilla.org/en-US/firefox/addon/get-cookies-txt-locally/",
}

/**
 * Sends the user to the right store instead of making them find it. Read
 * in an effect, not during render: `navigator` does not exist on the
 * server and reading it while rendering would desync hydration.
 */
function useExtensionUrl(): { url: string; label: string } {
  const [firefox, setFirefox] = React.useState(false)
  React.useEffect(() => {
    setFirefox(navigator.userAgent.includes("Firefox"))
  }, [])
  return firefox
    ? { url: EXTENSION.firefox, label: "Add to Firefox" }
    : { url: EXTENSION.chromium, label: "Add to Chrome or Edge" }
}

/** Warnings the user must read BEFORE acting, so they sit above the action. */
function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-amber-600 bg-amber-50 p-4 dark:bg-amber-950">
      <HugeiconsIcon
        icon={Alert02Icon}
        size={18}
        strokeWidth={2}
        className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300"
      />
      <p className="text-amber-900 text-sm leading-relaxed dark:text-amber-100">
        {children}
      </p>
    </div>
  )
}

/** A URL the user must open in ANOTHER browser, so it is copyable. */
function CopyableUrl({ url }: { url: string }) {
  const [copied, setCopied] = React.useState(false)

  // Cleared on a timer, so the timer is cleaned up if the step changes
  // before it fires.
  React.useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted p-2 pl-4">
      <code className="flex-1 truncate font-mono text-foreground text-xs">
        {url}
      </code>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => {
          void navigator.clipboard.writeText(url).then(() => setCopied(true))
        }}
        className="shrink-0 transition-colors hover:text-sky-700 active:scale-[0.97] dark:hover:text-sky-300"
      >
        <HugeiconsIcon
          icon={copied ? Tick02Icon : Copy01Icon}
          size={15}
          strokeWidth={2}
        />
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  )
}

export function ConnectStepBody({
  provider,
  step,
}: {
  provider: SocialProvider
  step: (typeof CONNECT_STEPS)[number]["id"]
}) {
  const label = providerLabel(provider.name)
  const extension = useExtensionUrl()

  if (step === "install") {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm leading-relaxed">
          One free extension reads your signed-in session and saves it as a
          file. It runs entirely on your machine.
        </p>
        <Button
          size="lg"
          className="transition-transform active:scale-[0.98]"
          // Base UI keeps native button semantics unless told otherwise, and
          // warns (correctly) that an <a> is not a <button>. This IS a link:
          // it navigates to a store in a new tab.
          nativeButton={false}
          render={
            <a href={extension.url} target="_blank" rel="noreferrer noopener" />
          }
        >
          <HugeiconsIcon icon={PuzzleIcon} size={17} strokeWidth={2} />
          {extension.label}
        </Button>
        <Note>
          Install the one called{" "}
          <span className="font-semibold">Get cookies.txt LOCALLY</span>. The
          word LOCALLY matters: similarly named extensions upload what they read
          to someone else's server, and a session file is enough to sign in as
          you.
        </Note>
      </div>
    )
  }

  if (step === "signin") {
    return (
      <div className="space-y-4">
        {provider.notes.signIn ? <Note>{provider.notes.signIn}</Note> : null}
        <p className="text-muted-foreground text-sm leading-relaxed">
          Sign in as the account you want Relay to use. Relay never sees your
          password, and 2FA works normally because this happens in your own
          browser.
        </p>
        <Button
          variant="outline"
          size="lg"
          className="transition-colors hover:border-sky-600 hover:text-sky-700 active:scale-[0.98] dark:hover:text-sky-300"
          nativeButton={false}
          render={
            <a
              href={provider.loginUrl}
              target="_blank"
              rel="noreferrer noopener"
            />
          }
        >
          <HugeiconsIcon icon={Login03Icon} size={17} strokeWidth={2} />
          Open {label} sign-in
        </Button>
      </div>
    )
  }

  if (step === "export") {
    return (
      <div className="space-y-4">
        {provider.notes.export ? <Note>{provider.notes.export}</Note> : null}
        <p className="text-muted-foreground text-sm leading-relaxed">
          In that same browser, open this page, then click the extension and
          choose <span className="font-medium text-foreground">Export</span>.
        </p>
        <CopyableUrl url={provider.exportUrl} />
        <p className="text-muted-foreground text-sm leading-relaxed">
          Keep the default <span className="font-medium">Netscape</span> format.
          If you are offered JSON, do not pick it. You will get a{" "}
          <code className="font-mono text-foreground text-xs">cookies.txt</code>{" "}
          file.
        </p>
      </div>
    )
  }

  return (
    <div className="flex gap-3 rounded-lg border border-border bg-muted p-4">
      <HugeiconsIcon
        icon={Shield01Icon}
        size={18}
        strokeWidth={2}
        className="mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-300"
      />
      <p className="text-muted-foreground text-sm leading-relaxed">
        Exporting <span className="font-medium text-foreground">all</span>{" "}
        cookies is fine. Relay keeps only the ones on{" "}
        <span className="font-mono text-foreground text-xs">
          {provider.cookieDomains
            .filter((domain) => domain.startsWith("."))
            .join(" ")}
        </span>{" "}
        and discards the rest before anything is saved. What it keeps is
        encrypted and never shown again.
      </p>
    </div>
  )
}
