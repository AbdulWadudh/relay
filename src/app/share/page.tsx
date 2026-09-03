import type { Metadata } from "next"
import { headers } from "next/headers"
import Link from "next/link"

import config from "@/config"
import { getSessionFromHeaders } from "@/lib/auth-session"
import { findLatestRunForUrl } from "@/lib/runs-lookup"
import { getShareAutoRun } from "@/lib/settings"

import { resolveShare } from "./resolve-share"
import { ShareTarget } from "./share-target"

export const metadata: Metadata = {
  title: "Share",
  robots: { index: false, follow: false },
}

// NOT session-gated: requireSession() would bounce a signed-out user to
// /login and the shared link would be gone. ShareTarget stashes it first.
export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value

  const resolution = resolveShare({
    url: first(params.url),
    text: first(params.text),
    title: first(params.title),
  })

  // Read here rather than through a client query: a fetch would flash the
  // "Ready when you are" panel before auto-run could take over.
  const session = await getSessionFromHeaders(await headers())
  const autoRun = session ? await getShareAutoRun(session.user.id) : false

  // Looked up on every render, which is what makes navigating BACK to this
  // page safe: once a run exists for the URL, auto-run is suppressed and
  // the user is offered it instead of silently queueing a duplicate.
  const existing =
    session && resolution.kind === "ok"
      ? await findLatestRunForUrl(
          session.user.id,
          resolution.source.canonicalUrl,
        )
      : null

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-5 py-10">
      <Link
        href={config.app.homePath}
        className="font-heading font-semibold text-lg tracking-wide"
      >
        {config.app.name}
      </Link>
      <ShareTarget
        incoming={resolution}
        autoRun={autoRun}
        existing={existing}
      />
    </main>
  )
}
