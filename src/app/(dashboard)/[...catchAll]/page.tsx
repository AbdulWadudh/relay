import { DashboardNotFoundPanel } from "@/components/dashboard-not-found-panel"
import { requireSession } from "@/lib/auth-session"

type Params = Promise<{ catchAll: string[] }>

function titleCase(segment: string): string {
  return segment
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ")
}

/** Falls back to the requested route itself, Title Cased segment by segment. */
function sectionTitle(segments: string[]): string {
  if (segments.length === 0) return "Not found"
  return segments.map(titleCase).join(" / ")
}

export async function generateMetadata({ params }: { params: Params }) {
  const { catchAll } = await params
  return { title: sectionTitle(catchAll) }
}

/**
 * Catches any URL that isn't a real dashboard route. Route groups don't add
 * a URL segment, so this matches at the app root too — any signed-in user
 * hitting an unknown path lands here instead of the standalone public 404,
 * keeping the sidebar/shell mounted. The header title reflects the section
 * they tried to reach (e.g. /queue -> "Queue") instead of a generic label.
 * requireSession() redirects unauthenticated visitors to /login, matching
 * every other page in this route group.
 */
export default async function DashboardCatchAll({
  params,
}: {
  params: Params
}) {
  await requireSession()
  const { catchAll } = await params
  return <DashboardNotFoundPanel title={sectionTitle(catchAll)} />
}
