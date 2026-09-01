"use client"

import { QueryErrorState } from "@/components/query-error"
import { QueryStatusBar } from "@/components/query-status"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  accountEmailFor,
  accountNameFor,
  dateFormat,
  displayName,
  ProviderTile,
  RowActions,
  StaleBadge,
  TypeBadge,
  VaultEmpty,
} from "@/components/vault/credentials-row"
import { CredentialsTableSkeleton } from "@/components/vault/credentials-table-skeleton"
import { useCredentials } from "@/lib/query/credentials"

export function CredentialsTable({
  configuredIds,
}: {
  configuredIds: string[]
}) {
  const {
    data: credentials,
    isPending,
    isError,
    error,
    dataUpdatedAt,
    isFetching,
    isStale,
    refetch,
  } = useCredentials()

  if (isPending) return <CredentialsTableSkeleton />

  if (isError && !credentials) {
    return (
      <QueryErrorState
        entity="credentials"
        error={error}
        onRetry={() => refetch()}
      />
    )
  }

  const rows = credentials ?? []

  if (rows.length === 0) return <VaultEmpty configuredIds={configuredIds} />

  return (
    <div className="flex flex-col gap-2">
      <QueryStatusBar
        entity="credentials"
        isFetching={isFetching}
        isStale={isStale}
        updatedAt={dataUpdatedAt}
        isError={isError}
        onRefresh={() => refetch()}
      />
      {/* Cards below lg, not sm: a tablet is wide enough to render the
              table but not wide enough to fit it, so it used to overflow
              into a horizontal scrollbar. The skeleton switches at the
              same breakpoint or the layout jumps on load. */}
      <div className="flex flex-col gap-3 lg:hidden">
        {rows.map((credential) => (
          <div
            key={credential.id}
            className="rounded-lg border p-4 transition-colors duration-200"
          >
            <div className="flex items-start gap-3">
              <ProviderTile provider={credential.provider} />
              <div className="grid min-w-0 flex-1 leading-tight">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">
                    {displayName(credential)}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <StaleBadge credential={credential} />
                    <TypeBadge type={credential.type} />
                  </div>
                </div>
                {accountNameFor(credential) ? (
                  <span className="truncate text-muted-foreground text-xs">
                    {accountNameFor(credential)}
                  </span>
                ) : null}
                {accountEmailFor(credential) ? (
                  <span className="truncate text-muted-foreground text-xs">
                    {accountEmailFor(credential)}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
              <span className="font-mono text-muted-foreground text-xs">
                Added {dateFormat.format(credential.createdAt)}
              </span>
              <RowActions credential={credential} />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((credential) => (
              <TableRow
                key={credential.id}
                className="transition-colors duration-200 hover:bg-muted"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <ProviderTile provider={credential.provider} />
                    <span className="font-medium">
                      {displayName(credential)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {accountNameFor(credential) ??
                    accountEmailFor(credential) ?? (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <TypeBadge type={credential.type} />
                    <StaleBadge credential={credential} />
                  </div>
                </TableCell>
                <TableCell className="font-mono text-muted-foreground text-xs">
                  {credential.expiresAt
                    ? dateFormat.format(credential.expiresAt)
                    : "Never"}
                </TableCell>
                <TableCell className="font-mono text-muted-foreground text-xs">
                  {dateFormat.format(credential.createdAt)}
                </TableCell>
                <TableCell>
                  <RowActions credential={credential} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
