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
import { providerLabel } from "@/lib/providers"
import type { MaskedCredential } from "@/lib/vault"

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" })

function metaString(credential: MaskedCredential, key: string): string | null {
  const value = credential.metaData?.[key]
  return typeof value === "string" && value.length > 0 ? value : null
}

/** Generic account name (provider registry contract); provider label otherwise. */
function nameFor(credential: MaskedCredential): string {
  return (
    metaString(credential, "account_name") ?? providerLabel(credential.provider)
  )
}

function accountFor(credential: MaskedCredential): string | null {
  return metaString(credential, "account_email")
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
          <EmptyMedia
            variant="icon"
            className="text-emerald-400 shadow-[0_0_24px_-6px_rgba(16,185,129,0.5)]"
          >
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
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Provider</TableHead>
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
              className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both transition-colors duration-200 hover:bg-emerald-500/[0.04]"
            >
              <TableCell>
                <div className="grid leading-tight">
                  <span className="font-medium">{nameFor(credential)}</span>
                  {accountFor(credential) ? (
                    <span className="text-muted-foreground text-xs">
                      {accountFor(credential)}
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {providerLabel(credential.provider)}
              </TableCell>
              <TableCell>
                {credential.type === "ray" ? (
                  <Badge className="border-violet-500/30 bg-violet-500/15 text-violet-300 transition-all duration-200 hover:bg-violet-500/25 hover:shadow-[0_0_10px_-2px_rgba(167,139,250,0.5)]">
                    Ray
                  </Badge>
                ) : (
                  <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-300 transition-all duration-200 hover:bg-emerald-500/25 hover:shadow-[0_0_10px_-2px_rgba(52,211,153,0.5)]">
                    API key
                  </Badge>
                )}
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
                <div className="flex items-center justify-end gap-1">
                  {credential.type === "ray" ? (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            nativeButton={false}
                            className="transition-all duration-200 hover:scale-110 hover:bg-sky-500/15 hover:text-sky-300 hover:shadow-[0_0_12px_-2px_rgba(56,189,248,0.5)]"
                            aria-label={`Reconnect ${providerLabel(credential.provider)}`}
                            render={
                              <a
                                href={`/api/v1/rays/${credential.provider}`}
                              />
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
                    providerLabel={nameFor(credential)}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
