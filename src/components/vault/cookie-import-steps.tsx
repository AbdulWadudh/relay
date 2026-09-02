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

const BROWSERS = {
  chromium: {
    store:
      "https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc",
    storeLabel: "Add to Chrome or Edge",
    // NOT a link, deliberately. Browsers refuse to navigate to a
    // `chrome://` URL from page content, so an <a> here would look
    // clickable and do nothing. It is handed over to be copied instead.
    settingsUrl: "chrome://extensions",
    privateName: "incognito",
    shortcut: "Ctrl+Shift+N",
    allowLabel: "Allow in incognito",
  },
  firefox: {
    store:
      "https://addons.mozilla.org/en-US/firefox/addon/get-cookies-txt-locally/",
    storeLabel: "Add to Firefox",
    settingsUrl: "about:addons",
    privateName: "private",
    shortcut: "Ctrl+Shift+P",
    allowLabel: "Run in Private Windows",
  },
}

/**
 * Sends the user to the right store and names the right settings page
 * instead of making them work out which browser they are in.
 *
 * Read in an effect, not during render: `navigator` does not exist on the
 * server and reading it while rendering would desync hydration. Chromium
 * is the default because it is both the majority case and the safer wrong
 * guess (a Firefox user sent to the Chrome store notices immediately; the
 * reverse is equally obvious, and neither loses data).
 */
function useBrowser(): (typeof BROWSERS)["chromium"] {
  const [firefox, setFirefox] = React.useState(false)
  React.useEffect(() => {
    setFirefox(navigator.userAgent.includes("Firefox"))
  }, [])
  return firefox ? BROWSERS.firefox : BROWSERS.chromium
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

/**
 * One action inside a step that is itself a short ordered sequence.
 *
 * The number is the point: these have to happen in order, and the export
 * step in particular breaks if the user does them in any other one.
 */
function SubStep({
  index,
  title,
  children,
}: {
  index: number
  title: string
  children: React.ReactNode
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border font-mono text-muted-foreground text-xs">
        {index}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-medium text-sm">{title}</p>
        <div className="text-muted-foreground text-sm leading-relaxed">
          {children}
        </div>
      </div>
    </li>
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
  const browser = useBrowser()

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
            <a href={browser.store} target="_blank" rel="noreferrer noopener" />
          }
        >
          <HugeiconsIcon icon={PuzzleIcon} size={17} strokeWidth={2} />
          {browser.storeLabel}
        </Button>
        <Note>
          Install the one called{" "}
          <span className="font-semibold">Get cookies.txt LOCALLY</span>. The
          word LOCALLY matters: similarly named extensions upload what they read
          to someone else's server, and a session file is enough to sign in as
          you.
        </Note>
        {/*
          Extensions are DISABLED in private windows by default, and the
          next step sends this user into one. Without this they reach the
          export step, find no extension in the toolbar, and have no way to
          tell that from a failed install. Only shown where it can bite.
        */}
        {provider.requiresPrivateWindow ? (
          <div className="space-y-2 rounded-lg border border-border bg-muted p-4">
            <p className="font-medium text-sm">
              Then allow it in {browser.privateName} windows
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Extensions are off in {browser.privateName} windows by default,
              and the next step needs one. Open this page, find{" "}
              <span className="font-medium text-foreground">
                Get cookies.txt LOCALLY
              </span>
              , and turn on{" "}
              <span className="font-medium text-foreground">
                {browser.allowLabel}
              </span>
              .
            </p>
            <CopyableUrl url={browser.settingsUrl} />
          </div>
        ) : null}
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
        {/*
          NO web page can open a private window, so where one is required
          the button below cannot do the job and the URL has to be copied
          into a window the user opens themselves. The button stays, but it
          is demoted and relabelled to say plainly what it actually does,
          because one line above we are telling them not to do that.
        */}
        {provider.requiresPrivateWindow ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Press{" "}
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-foreground text-xs">
                {browser.shortcut}
              </kbd>{" "}
              to open a {browser.privateName} window, then paste this into it.
            </p>
            <CopyableUrl url={provider.loginUrl} />
            {/*
              The handoff to the next step. Without it people sign in, close
              the tab because they are "done", and then cannot follow step 3
              — which is exactly the confusion this line exists to prevent.
            */}
            <p className="text-muted-foreground text-sm leading-relaxed">
              Once you are signed in,{" "}
              <span className="font-medium text-foreground">
                leave that tab open
              </span>{" "}
              and come back here. The next step reuses it.
            </p>
          </div>
        ) : null}
        <Button
          variant={provider.requiresPrivateWindow ? "ghost" : "outline"}
          size={provider.requiresPrivateWindow ? "default" : "lg"}
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
          {provider.requiresPrivateWindow
            ? "Open in a normal tab instead"
            : `Open ${label} sign-in`}
        </Button>
      </div>
    )
  }

  if (step === "export") {
    return (
      <div className="space-y-4">
        {provider.notes.export ? <Note>{provider.notes.export}</Note> : null}
        {/*
          Numbered, because three things have to happen in ORDER and the
          previous prose version got that wrong twice: it said "same
          browser" where the procedure needs the same TAB, and it put
          "then close the window" in a warning ABOVE the instruction to
          navigate, so the cleanup read as though it came first.
        */}
        <ol className="space-y-4">
          <SubStep index={1} title="Navigate that tab to this address">
            <CopyableUrl url={provider.exportUrl} />
          </SubStep>
          <SubStep index={2} title="Click the extension, then Export">
            Keep the default{" "}
            <span className="font-medium text-foreground">Netscape</span>{" "}
            format. If you are offered JSON, do not pick it. You will get a{" "}
            <code className="font-mono text-foreground text-xs">
              cookies.txt
            </code>{" "}
            file.
          </SubStep>
          {provider.notes.afterExport ? (
            <SubStep index={3} title="Close the window">
              {provider.notes.afterExport}
            </SubStep>
          ) : null}
        </ol>
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
