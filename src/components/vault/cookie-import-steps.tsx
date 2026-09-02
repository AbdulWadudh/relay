"use client"

import {
  Alert02Icon,
  LinkSquare02Icon,
  Login03Icon,
  PuzzleIcon,
  Shield01Icon,
  Upload04Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { providerLabel } from "@/lib/providers"
import type { SocialProvider } from "@/lib/social/providers"

/**
 * The export instructions, driven entirely by the registry entry
 * (SESSION_AUTH.md §2.4) — every provider-specific string comes from
 * `provider`, so this component never names a source.
 *
 * These steps ARE the feature. Relay no longer drives a browser, so an
 * export the user gets subtly wrong is the whole failure surface: the
 * wrong export format, an export taken while signed out, or (on Google)
 * an export invalidated by reopening the tab a second later.
 */

const EXTENSION_URL =
  "https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc"

function Step({
  index,
  icon,
  accent,
  title,
  children,
}: {
  index: number
  icon: typeof PuzzleIcon
  accent: string
  title: string
  children: React.ReactNode
}) {
  return (
    <li className="flex gap-4">
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-white transition-transform duration-200 group-hover/step:scale-105 ${accent}`}
      >
        <HugeiconsIcon icon={icon} size={18} strokeWidth={2} />
      </span>
      <div className="space-y-1 pt-1">
        <p className="font-medium text-sm leading-none">
          <span className="mr-2 font-mono text-muted-foreground text-xs">
            {index}
          </span>
          {title}
        </p>
        <div className="text-muted-foreground text-sm leading-relaxed">
          {children}
        </div>
      </div>
    </li>
  )
}

function Link({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 font-medium text-foreground underline decoration-dotted underline-offset-4 transition-colors hover:text-violet-700 dark:hover:text-violet-300"
    >
      {children}
      <HugeiconsIcon icon={LinkSquare02Icon} size={13} strokeWidth={2} />
    </a>
  )
}

export function CookieImportSteps({ provider }: { provider: SocialProvider }) {
  const label = providerLabel(provider.name)

  return (
    <div className="space-y-5">
      <ol className="space-y-4">
        <Step
          index={1}
          icon={PuzzleIcon}
          accent="bg-violet-600"
          title="Install the export extension"
          // "LOCALLY" is not a typo and not interchangeable with the
          // similarly named extensions: it is the open-source one that
          // writes the file on your machine and uploads nothing.
        >
          <Link href={EXTENSION_URL}>Get cookies.txt LOCALLY</Link> for Chrome
          or Edge. The word <span className="font-medium">LOCALLY</span> matters
          — similarly named extensions send your cookies to a server.
        </Step>

        <Step
          index={2}
          icon={Login03Icon}
          accent="bg-sky-600"
          title={`Sign in to ${label}`}
        >
          Open <Link href={provider.loginUrl}>{label}</Link> and sign in as the
          account you want Relay to use.
        </Step>

        <Step
          index={3}
          icon={LinkSquare02Icon}
          accent="bg-emerald-600"
          title="Go to the export page"
        >
          In that same browser, open{" "}
          <Link href={provider.exportUrl}>
            {new URL(provider.exportUrl).host}
            {new URL(provider.exportUrl).pathname.replace(/\/$/, "")}
          </Link>
          , then click the extension and choose{" "}
          <span className="font-medium text-foreground">Export</span>. It saves
          a <code className="font-mono text-xs">cookies.txt</code> file.
        </Step>

        <Step
          index={4}
          icon={Upload04Icon}
          accent="bg-amber-600"
          title="Upload it below"
        >
          Pick the file, or open it in a text editor and paste the contents.
        </Step>
      </ol>

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

      {provider.caution ? (
        <div className="flex gap-3 rounded-lg border border-amber-600 bg-amber-50 p-4 dark:bg-amber-950">
          <HugeiconsIcon
            icon={Alert02Icon}
            size={18}
            strokeWidth={2}
            className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300"
          />
          <p className="text-amber-900 text-sm leading-relaxed dark:text-amber-100">
            {provider.caution}
          </p>
        </div>
      ) : null}

      <p className="text-muted-foreground text-sm leading-relaxed">
        <span className="font-medium text-foreground">Keeping it alive.</span>{" "}
        The session dies when you sign out of {label} in your own browser or
        change your password — so stay signed in there. Relay paces its own use
        well under normal browsing, and tells you here when a session stops
        working so you can re-import.
      </p>
    </div>
  )
}
