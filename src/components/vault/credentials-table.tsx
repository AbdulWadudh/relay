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
  ProviderTile,
  RowActions,
  TypeBadge,
  VaultEmpty,
} from "@/components/vault/credentials-row"
import { CredentialsTableSkeleton } from "@/components/vault/credentials-table-skeleton"
import { providerLabel } from "@/lib/providers"
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
    isFetching,
    isStale,
    dataUpdatedAt,
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
        isError={isError}
        updatedAt={dataUpdatedAt}
        onRefresh={() => refetch()}
      />
      {/* Narrow viewports can't fit a 6-column table — a stacked card per
          credential reads far better than a squeezed or horizontally
          scrolling grid. Provider is the thing that matters most at a
          glance, so it leads the card (icon + name), not the account. */}
      <div className="flex flex-col gap-3 sm:hidden">
        {rows.map((credential) => (
          <div
            key={credential.id}
            className="fade-in slide-in-from-bottom-1 animate-in rounded-lg border fill-mode-both p-4 transition-colors duration-200"
          >
            <div className="flex items-start gap-3">
              <ProviderTile provider={credential.provider} />
              <div className="grid min-w-0 flex-1 leading-tight">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">
                    {providerLabel(credential.provider)}
                  </span>
                  <TypeBadge type={credential.type} />
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

      <div className="hidden rounded-lg border sm:block">
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
                className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both transition-colors duration-200 hover:bg-muted"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <ProviderTile provider={credential.provider} />
                    <span className="font-medium">
                      {providerLabel(credential.provider)}
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
                  <TypeBadge type={credential.type} />
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
