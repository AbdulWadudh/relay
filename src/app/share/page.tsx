import type { Metadata } from "next"
import Link from "next/link"

import config from "@/config"

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

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-5 py-10">
      <Link
        href="/runs"
        className="font-heading font-semibold text-lg tracking-wide"
      >
        {config.app.name}
      </Link>
      <ShareTarget incoming={resolution} />
    </main>
  )
}
