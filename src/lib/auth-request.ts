import { cache } from "react"

import { type AuthSession, auth } from "@/lib/auth"

// Both the (dashboard) layout and every page under it call this per request
// (layout for the sidebar's user info, page via requireSession()). Without
// per-request memoization that's two separate DB round-trips to the same
// remote session table on every navigation; cache() collapses them into one.
export const getRequestSession = cache(
  (requestHeaders: Headers): Promise<AuthSession | null> => {
    return auth.api.getSession({ headers: requestHeaders })
  },
)
