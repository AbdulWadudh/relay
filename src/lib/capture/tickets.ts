import config from "@/config"
import { createRedis } from "@/lib/queue/connection"

/**
 * Single-use tickets authorising the screencast socket
 * (SESSION_AUTH.md §5.2).
 *
 * WHY A TICKET RATHER THAN THE APP'S SESSION COOKIE. Browsers cannot set
 * headers on a `WebSocket` constructor, so a bearer token is unavailable,
 * and authorising the socket with the ordinary session cookie would make it
 * reachable by CSRF from any origin. A short-lived, single-use, per-session
 * ticket in the query string is the correct shape: it grants exactly one
 * connection to exactly one browser and expires in a minute.
 *
 * Redemption is a single atomic GETDEL, so two racing connections cannot
 * both redeem the same ticket — the loser gets nothing.
 *
 * The ticket is a capability for a remote-controlled browser. It is never
 * logged, and it identifies both the user and the session so a valid ticket
 * for one cannot be pointed at another.
 */

export interface TicketClaims {
  userId: string
  sessionId: string
}

/**
 * A dedicated client with the offline queue ON. ioredis connects lazily, so
 * the first command after process start races the socket; with the queue
 * off that throws and the very first sign-in after a deploy fails. Buffering
 * for a few milliseconds is the right trade for a ticket read.
 */
let client: ReturnType<typeof createRedis> | null = null
function redis() {
  client ??= createRedis({ enableOfflineQueue: true })
  return client
}

function key(ticket: string): string {
  return `${config.cache.prefix}:capture:ticket:${ticket}`
}

export async function issueTicket(claims: TicketClaims): Promise<string> {
  const ticket = crypto.randomUUID()
  await redis().set(
    key(ticket),
    JSON.stringify(claims),
    "PX",
    config.capture.ticketTtlMs,
  )
  return ticket
}

/**
 * Redeems and destroys in one command. Returns null for an unknown,
 * expired, or already-used ticket — all three are the same answer to the
 * caller, deliberately, so a probe learns nothing from the difference.
 */
export async function redeemTicket(
  ticket: string,
): Promise<TicketClaims | null> {
  if (!ticket || ticket.length > 64) return null

  let raw: string | null
  try {
    // GETDEL is Redis 6.2+ and supported by Dragonfly. Falling back to
    // GET-then-DEL would reintroduce the race this exists to close.
    raw = await redis().getdel(key(ticket))
  } catch {
    return null
  }
  if (!raw) return null

  try {
    const claims = JSON.parse(raw) as TicketClaims
    if (
      typeof claims.userId !== "string" ||
      typeof claims.sessionId !== "string"
    ) {
      return null
    }
    return claims
  } catch {
    return null
  }
}
