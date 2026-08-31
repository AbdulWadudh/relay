import { DashboardNotFoundPanel } from "@/components/dashboard-not-found-panel"

export const metadata = { title: "Not found" }

/**
 * Generic fallback if `notFound()` is ever called from somewhere other than
 * the `[...catchAll]` page (which renders a section-aware title itself and
 * doesn't hit this boundary). Always renders inside the authenticated shell.
 */
export default function DashboardNotFound() {
  return <DashboardNotFoundPanel title="Not found" />
}
