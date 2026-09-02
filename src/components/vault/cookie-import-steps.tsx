"use client"

import {
  LinkSquare02Icon,
  Login03Icon,
  PuzzleIcon,
  Shield01Icon,
  SmartPhone01Icon,
  Upload04Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  type ConnectPlatform,
  DEFAULT_GUIDE,
  FIREFOX_ANDROID_STORE,
  useBrowserGuide,
} from "@/components/vault/connect-browsers"
import {
  CopyableUrl,
  Note,
  SubStep,
} from "@/components/vault/connect-step-parts"
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

/**
 * The dead end, stated plainly.
 *
 * Chrome for Android has no extensions and neither does anything on iOS,
 * and the session cookies are httpOnly, so nothing that runs inside a page
 * can reach them. Sending this user to a store would waste their time, so
 * the step names the one thing that does work on their device instead.
 */
function NoExtensions({ platform }: { platform: ConnectPlatform }) {
  return (
    <div className="space-y-4">
      <Note>
        This browser takes no extensions, and the export needs one. There is no
        way around it from a web page: the cookies that hold your session are
        marked httpOnly, so nothing running inside a page can read them,
        including Relay.
      </Note>
      <div className="space-y-3 rounded-lg border border-border bg-muted p-4">
        <div className="flex items-center gap-3">
          <HugeiconsIcon
            icon={SmartPhone01Icon}
            size={18}
            strokeWidth={2}
            className="shrink-0 text-muted-foreground"
          />
          <p className="font-medium text-sm">
            {platform === "android"
              ? "Use Firefox for Android"
              : "Export on a computer"}
          </p>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {platform === "android"
            ? "It is the one mobile browser that still takes add-ons, and the cookie exporter is published for it. Install it, open Relay there, and start this wizard again."
            : "Sign in and export on a desktop browser, then finish there or send yourself the file and upload it from this device. The file does not care which device made it."}
        </p>
        {platform === "android" ? (
          <Button
            size="lg"
            className="transition-transform active:scale-[0.98]"
            nativeButton={false}
            render={
              <a
                href={FIREFOX_ANDROID_STORE}
                target="_blank"
                rel="noreferrer noopener"
              />
            }
          >
            Get Firefox for Android
          </Button>
        ) : null}
      </div>
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
  const { platform, guide } = useBrowserGuide()

  if (step === "install") {
    if (!guide) return <NoExtensions platform={platform} />
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
            <a href={guide.store} target="_blank" rel="noreferrer noopener" />
          }
        >
          <HugeiconsIcon icon={PuzzleIcon} size={17} strokeWidth={2} />
          {guide.storeLabel}
        </Button>
        <Note>
          Install the one called{" "}
          <span className="font-semibold">{guide.extension}</span>, exactly. The
          name matters: similarly named extensions upload what they read to
          someone else's server, and a session file is enough to sign in as you.
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
              Then allow it in {guide.privateName} windows
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Extensions are off in {guide.privateName} windows by default, and
              the next step needs one. Open{" "}
              <span className="font-medium text-foreground">
                {guide.settingsPath}
              </span>
              , find{" "}
              <span className="font-medium text-foreground">
                {guide.extension}
              </span>
              , and turn on{" "}
              <span className="font-medium text-foreground">
                {guide.allowLabel}
              </span>
              .
            </p>
            {guide.settingsUrl ? <CopyableUrl url={guide.settingsUrl} /> : null}
          </div>
        ) : null}
      </div>
    )
  }

  // From here the steps happen in whichever browser has the extension, so
  // a device with no route of its own follows the desktop wording.
  const active = guide ?? DEFAULT_GUIDE

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
              {active.shortcut ? (
                <>
                  Press{" "}
                  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-foreground text-xs">
                    {active.shortcut}
                  </kbd>{" "}
                  to open a new {active.privateName} window, then paste this
                  into it.
                </>
              ) : (
                <>{active.privateHow} Then paste this into that tab.</>
              )}
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
          <SubStep
            index={2}
            title={`Open the extension ${active.extensionLocation}, then Export`}
          >
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
