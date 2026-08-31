import { RefreshIcon, VaultIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { AddConnectionDialog } from "@/components/vault/add-connection-dialog"
import { DeleteCredential } from "@/components/vault/delete-credential"
import { providerIcon, providerLabel, providerTile } from "@/lib/providers"
import { cn } from "@/lib/utils"
import type { MaskedCredential } from "@/lib/vault"

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" })

function metaString(credential: MaskedCredential, key: string): string | null {
  const value = credential.metaData?.[key]
  return typeof value === "string" && value.length > 0 ? value : null
}

/** Account name (provider registry contract), only when distinct from the provider itself. */
function accountNameFor(credential: MaskedCredential): string | null {
  const name = metaString(credential, "account_name")
  return name && name !== providerLabel(credential.provider) ? name : null
}

function accountEmailFor(credential: MaskedCredential): string | null {
  return metaString(credential, "account_email")
}

function ProviderTile({ provider }: { provider: string }) {
  const icon = providerIcon(provider)
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg",
        providerTile(provider),
      )}
    >
      {icon ? (
        <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-5" />
      ) : null}
    </span>
  )
}

function TypeBadge({ type }: { type: MaskedCredential["type"] }) {
  return type === "oauth" ? (
    <Badge className="shrink-0 border-transparent bg-violet-600 text-white">
      OAuth
    </Badge>
  ) : (
    <Badge className="shrink-0 border-transparent bg-emerald-600 text-white">
      API key
    </Badge>
  )
}

function RowActions({ credential }: { credential: MaskedCredential }) {
  return (
    <div className="flex items-center justify-end gap-1">
      {credential.type === "oauth" ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                nativeButton={false}
                className="transition-all duration-200 hover:scale-110 hover:bg-sky-600 hover:text-white dark:hover:bg-sky-600"
                aria-label={`Reconnect ${providerLabel(credential.provider)}`}
                render={
                  <a href={`/api/v1/rays/oauth/${credential.provider}`} />
                }
              />
            }
          >
            <HugeiconsIcon icon={RefreshIcon} strokeWidth={1.5} />
          </TooltipTrigger>
          <TooltipContent>
            Reconnect {providerLabel(credential.provider)}
          </TooltipContent>
        </Tooltip>
      ) : null}
      <DeleteCredential
        credentialId={credential.id}
        providerLabel={providerLabel(credential.provider)}
      />
    </div>
  )
}

export function CredentialsTable({
  credentials,
  configuredIds,
}: {
  credentials: MaskedCredential[]
  configuredIds: string[]
}) {
  if (credentials.length === 0) {
    return (
      <Empty className="fade-in zoom-in-95 animate-in rounded-lg border border-dashed fill-mode-both transition-colors duration-300 hover:border-emerald-500/40">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-emerald-600 text-white">
            <HugeiconsIcon
              icon={VaultIcon}
              strokeWidth={1.5}
              className="animate-pulse"
            />
          </EmptyMedia>
          <EmptyTitle>The vault is empty</EmptyTitle>
          <EmptyDescription>
            Add an AI provider key or connect a workspace to start processing
            videos.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <AddConnectionDialog configuredIds={configuredIds} />
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <>
      {/* Narrow viewports can't fit a 6-column table — a stacked card per
          credential reads far better than a squeezed or horizontally
          scrolling grid. Provider is the thing that matters most at a
          glance, so it leads the card (icon + name), not the account. */}
      <div className="flex flex-col gap-3 sm:hidden">
        {credentials.map((credential) => (
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
            {credentials.map((credential) => (
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
    </>
  )
}
