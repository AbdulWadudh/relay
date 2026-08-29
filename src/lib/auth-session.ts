import { headers } from "next/headers"
import { redirect } from "next/navigation"

import type { AuthSession } from "@/lib/auth"
import { getRequestSession } from "@/lib/auth-request"

export async function getSessionFromHeaders(
  requestHeaders: Headers,
): Promise<AuthSession | null> {
  return getRequestSession(requestHeaders)
}

export async function requireSession(): Promise<AuthSession> {
  const session = await getSessionFromHeaders(await headers())
  if (!session) redirect("/login")
  return session
}
