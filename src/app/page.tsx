import { headers } from "next/headers"

import { LandingPage } from "@/components/landing-page"
import { getSessionFromHeaders } from "@/lib/auth-session"

export default async function Home() {
  const session = await getSessionFromHeaders(await headers())
  return <LandingPage isAuthenticated={Boolean(session)} />
}
