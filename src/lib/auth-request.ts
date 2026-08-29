import { type AuthSession, auth } from "@/lib/auth"

export function getRequestSession(
  requestHeaders: Headers,
): Promise<AuthSession | null> {
  return auth.api.getSession({ headers: requestHeaders })
}
