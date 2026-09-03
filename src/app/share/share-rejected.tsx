"use client"

import { Alert02Icon } from "@hugeicons/core-free-icons"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { relayProcessSchema } from "@/lib/schemas"

import type { ShareResolution } from "./resolve-share"
import { SharePanel } from "./share-panel"

// The refine's issue, not issues[0]: an empty url trips `.min(1)` first and
// that message is Zod's own "Too small: expected string to have >=1
// characters". The refine owns the supported-sources sentence.
function rejectionMessage(url: string): string {
  const parsed = relayProcessSchema.safeParse({ url })
  if (parsed.success) return ""
  const issues = parsed.error.issues
  return (
    issues.find((issue) => issue.code === "custom")?.message ??
    issues[0]?.message ??
    ""
  )
}

export function ShareRejected({ resolution }: { resolution: ShareResolution }) {
  const raw = resolution.kind === "unsupported" ? resolution.raw : undefined
  return (
    <SharePanel
      tone="warning"
      icon={Alert02Icon}
      title={raw ? "Relay can't process that link" : "Nothing was shared"}
      description={rejectionMessage(raw ?? "")}
      sharedUrl={raw}
    >
      <Button
        nativeButton={false}
        render={<Link href="/runs" />}
        className="transition-all duration-200 hover:-translate-y-px"
      >
        Open Relay
      </Button>
    </SharePanel>
  )
}
