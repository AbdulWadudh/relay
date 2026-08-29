import { VaultIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
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
import { DeleteCredential } from "@/components/vault/delete-credential"
import type { MaskedCredential } from "@/lib/vault"

export const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  groq: "Groq",
  gemini: "Gemini",
  notion: "Notion",
}

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" })

function detailsFor(credential: MaskedCredential): string {
  const workspace = credential.metaData?.workspace_name
  if (typeof workspace === "string" && workspace.length > 0) {
    return workspace
  }
  return "Encrypted at rest"
}

export function CredentialsTable({
  credentials,
}: {
  credentials: MaskedCredential[]
}) {
  if (credentials.length === 0) {
    return (
      <Empty className="rounded-lg border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={VaultIcon} strokeWidth={1.5} />
          </EmptyMedia>
          <EmptyTitle>The vault is empty</EmptyTitle>
          <EmptyDescription>
            Add an AI provider key or connect a Notion workspace to start
            processing videos.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Provider</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Added</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {credentials.map((credential) => (
            <TableRow key={credential.id}>
              <TableCell className="font-medium">
                {PROVIDER_LABELS[credential.provider] ?? credential.provider}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {credential.type === "oauth" ? "OAuth" : "API key"}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {detailsFor(credential)}
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
                <DeleteCredential
                  credentialId={credential.id}
                  providerLabel={
                    PROVIDER_LABELS[credential.provider] ?? credential.provider
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
