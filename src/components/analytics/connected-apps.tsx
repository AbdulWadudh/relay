"use client"

import {
  Alert02Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { ChartCard, ChartEmpty } from "@/components/charts/chart-card"
import { ChartTable } from "@/components/charts/chart-table"
import { formatRelative, plural, statusColor } from "@/components/charts/tokens"
import { ProviderMark } from "@/components/provider-mark"
import { TypeBadge } from "@/components/vault/credentials-row"
import type {
  ConnectedApp,
  CredentialHealth,
} from "@/lib/analytics/credentials"

/**
 * Per-credential health. A TABLE, not a chart — these are heterogeneous
 * per-row attributes, not a magnitude to compare, and the form heuristic
 * sends that to a table every time.
 *
 * Health is a status, so it wears status tokens AND ships an icon and a
 * word. Colour never carries the meaning alone, which matters most here:
 * warning and serious sit below 3:1 on a light surface by design, and the
 * icon-plus-label pairing is the documented mitigation.
 *
 * "Last used" is PER PROVIDER. A run records which provider each stage
 * used, never which of several accounts the fallback chain picked, so the
 * column header says so rather than implying precision the data does not
 * have.
 *
 * Below `lg` the lookup columns FOLD into each row's disclosure rather
 * than being dropped: provider, health and last-used are what the panel is
 * for, but account and key type are still the answer to "which one is
 * this", and a phone should not lose them.
 *
 * The type badge is the Vault's own `TypeBadge` — same solid per-type
 * fills, same exhaustive `Record<CredentialType, …>`. A second local
 * vocabulary here would drift the moment a credential type is added.
 */

const HEALTH: Record<
  CredentialHealth,
  {
    label: string
    role: Parameters<typeof statusColor>[0]
    icon: typeof Alert02Icon
  }
> = {
  healthy: { label: "Healthy", role: "good", icon: CheckmarkCircle02Icon },
  expiring: { label: "Expiring soon", role: "warning", icon: Clock01Icon },
  stale: { label: "Stale", role: "serious", icon: Alert02Icon },
  expired: { label: "Expired", role: "critical", icon: CancelCircleIcon },
}

const BASIS_NOTE: Record<string, string> = {
  model: "a model call",
  publish: "a publish",
  source: "a download from this platform",
}

function HealthCell({ app }: { app: ConnectedApp }) {
  const meta = HEALTH[app.health]
  return (
    <span className="flex items-center gap-2">
      <HugeiconsIcon
        icon={meta.icon}
        size={16}
        strokeWidth={2}
        style={{ color: statusColor(meta.role) }}
        className="shrink-0"
        aria-hidden="true"
      />
      <span className="min-w-0">
        <span className="block text-foreground">{meta.label}</span>
        {app.rejectCount > 0 ? (
          <span className="block text-muted-foreground text-xs">
            {plural(app.rejectCount, "reject")}
          </span>
        ) : null}
      </span>
    </span>
  )
}

export function ConnectedApps({ apps }: { apps: ConnectedApp[] }) {
  const unhealthy = apps.filter((app) => app.health !== "healthy").length

  return (
    <ChartCard
      title="Connected apps"
      subtitle={
        unhealthy > 0
          ? `${unhealthy} of ${apps.length} credentials need attention.`
          : `All ${apps.length} credentials are healthy.`
      }
      caption="Last used is resolved per PROVIDER, not per account — a run records which provider a stage used, not which credential the fallback chain picked."
      height={Math.max(apps.length * 53 + 44, 120)}
    >
      {apps.length === 0 ? (
        <ChartEmpty message="No credentials connected yet." />
      ) : (
        <ChartTable
          rows={apps}
          rowKey={(app) => app.id}
          collapseBelow="lg"
          columns={[
            {
              key: "provider",
              header: "Provider",
              cell: (app) => (
                <span className="flex items-center gap-2">
                  <ProviderMark provider={app.provider} className="size-4" />
                  <span className="font-medium text-foreground">
                    {app.providerLabel}
                  </span>
                </span>
              ),
            },
            {
              key: "account",
              header: "Account",
              wrapAnywhere: true,
              secondary: true,
              cell: (app) => (
                <span className="text-muted-foreground">
                  {app.account ?? "—"}
                </span>
              ),
            },
            {
              key: "type",
              header: "Type",
              secondary: true,
              cell: (app) => <TypeBadge type={app.type} />,
            },
            {
              key: "state",
              header: "State",
              secondary: true,
              cell: (app) => (
                <span
                  className={
                    app.active ? "text-foreground" : "text-muted-foreground"
                  }
                >
                  {app.active ? "Active" : "Disabled"}
                </span>
              ),
            },
            {
              key: "health",
              header: "Health",
              cell: (app) => <HealthCell app={app} />,
            },
            {
              key: "used",
              header: "Last used",
              cell: (app) => (
                <span
                  className="text-muted-foreground"
                  title={
                    app.lastUsedBasis
                      ? `From ${BASIS_NOTE[app.lastUsedBasis] ?? "a run"}`
                      : undefined
                  }
                >
                  {formatRelative(app.lastUsedAt)}
                </span>
              ),
            },
          ]}
        />
      )}
    </ChartCard>
  )
}
