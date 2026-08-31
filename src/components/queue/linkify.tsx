import { Fragment } from "react"

import { LinkIcon } from "@/components/queue/link-icon"
import { cn } from "@/lib/utils"

/**
 * External links rendered as an icon plus a readable label instead of a
 * raw URL.
 *
 * Icon resolution lives in LinkIcon: a bundled brand mark where we have
 * one (covering the social links that fill most video descriptions with
 * no network call), otherwise the configured favicon service, otherwise a
 * generic glyph.
 */

function hostOf(href: string): string | null {
  try {
    return new URL(href).hostname.replace(/^www\./, "")
  } catch {
    return null
  }
}

export function ExternalLink({
  href,
  label,
  className,
  showIcon = true,
}: {
  href: string
  /**
   * Defaults to the full URL. Showing the linked page's *title* would mean
   * the server fetching arbitrary external URLs found in descriptions
   * (an SSRF surface, plus latency), so the URL itself is the label.
   */
  label?: string
  className?: string
  /** Off where the surrounding row already shows the source's mark. */
  showIcon?: boolean
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex max-w-full items-baseline gap-1.5 align-baseline underline-offset-4 hover:underline",
        "text-amber-700 transition-colors duration-200 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300",
        className,
      )}
    >
      {showIcon ? (
        <span className="inline-flex translate-y-[0.15em] items-center">
          <LinkIcon host={hostOf(href)} />
        </span>
      ) : null}
      <span className="[overflow-wrap:anywhere]">{label ?? href}</span>
    </a>
  )
}

/**
 * Stops before characters that commonly *follow* a URL rather than belong
 * to it. Sentence punctuation is trimmed separately below.
 */
const URL_PATTERN = /(https?:\/\/[^\s<>"'`)\]}]+)/g
const TRAILING = /[.,;:!?]+$/

interface Token {
  key: string
  text: string
  href?: string
}

/**
 * Splits free text into plain and link tokens. Keys come from each token's
 * character offset, which is stable and unique without using the array
 * index (which React would mis-reconcile if the text changed).
 */
function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  let cursor = 0

  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index
    if (start > cursor) {
      tokens.push({ key: `t${cursor}`, text: text.slice(cursor, start) })
    }
    const raw = match[0]
    const trailing = raw.match(TRAILING)?.[0] ?? ""
    const href = trailing ? raw.slice(0, -trailing.length) : raw
    tokens.push({ key: `l${start}`, text: href, href })
    if (trailing) {
      tokens.push({ key: `p${start + href.length}`, text: trailing })
    }
    cursor = start + raw.length
  }

  if (cursor < text.length) {
    tokens.push({ key: `t${cursor}`, text: text.slice(cursor) })
  }
  return tokens
}

/** Turns bare URLs inside free text into labelled links. */
export function Linkify({ text }: { text: string }) {
  return (
    <>
      {tokenize(text).map((token) =>
        token.href ? (
          <ExternalLink key={token.key} href={token.href} />
        ) : (
          <Fragment key={token.key}>{token.text}</Fragment>
        ),
      )}
    </>
  )
}
