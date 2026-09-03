"use client"

import type * as React from "react"

import { ProviderMark } from "@/components/provider-mark"
import { Badge } from "@/components/ui/badge"
import { providerAccent } from "@/lib/provider-styles"
import { cn } from "@/lib/utils"

/**
 * One selectable provider in the add-credential dialog.
 *
 * The Ray grid and the Account grid were near-identical files, and the same
 * 200-character class string had been copied into three places. This is
 * that card, once.
 *
 * It renders as a link, a button or an inert div depending on what the
 * provider can actually do — an unavailable provider must not be focusable
 * or announce itself as pressable, and a Ray connect is a real navigation
 * rather than a click handler.
 */

export interface ProviderCardProps {
  id: string
  label: string
  description: string
  /** Amber "Soon" / red "Needs setup" — absent when the card is usable. */
  badge?: { text: string; className: string }
  /** Staggers the entrance so a grid resolves rather than snapping in. */
  index: number
  /** Why the card is inert, surfaced as a tooltip. */
  disabledReason?: string
  href?: string
  onClick?: () => void
}

export function ProviderCard({
  id,
  label,
  description,
  badge,
  index,
  disabledReason,
  href,
  onClick,
}: ProviderCardProps) {
  const accent = providerAccent(id)
  const enabled = !disabledReason

  const body = (
    <>
      <ProviderMark
        provider={id}
        className="size-10 transition-transform duration-300 ease-out group-hover/card:-rotate-3"
      />
      <span className="grid flex-1 gap-1 text-start leading-snug">
        <span className="flex items-center gap-2 font-medium text-base">
          {label}
          {badge ? (
            <Badge className={cn("text-[10px] text-white", badge.className)}>
              {badge.text}
            </Badge>
          ) : null}
        </span>
        <span className="text-muted-foreground text-sm">{description}</span>
      </span>
    </>
  )

  const className = cn(
    "group/card fade-in slide-in-from-bottom-2 flex w-full animate-in items-center gap-4 rounded-xl border fill-mode-both p-4 text-start transition-all duration-200",
    enabled
      ? cn(accent.hover, "hover:-translate-y-px active:translate-y-0")
      : "cursor-not-allowed opacity-60",
  )
  const style: React.CSSProperties = { animationDelay: `${index * 70}ms` }

  if (!enabled) {
    return (
      <div className={className} style={style} title={disabledReason}>
        {body}
      </div>
    )
  }
  if (href) {
    return (
      <a href={href} className={className} style={style}>
        {body}
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} className={className} style={style}>
      {body}
    </button>
  )
}
