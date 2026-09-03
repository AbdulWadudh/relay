"use client"

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import * as React from "react"

import { ChainEntryRow } from "@/components/settings/chain-entry-row"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import type { ChainEntry } from "@/lib/extraction/chain"
import { useCredentials } from "@/lib/query/credentials"
import {
  useExtractionChain,
  useSaveExtractionChain,
} from "@/lib/query/settings"
import type { MaskedCredential } from "@/lib/vault"

/**
 * The extraction fallback chain (Settings).
 *
 * One FLAT list of accounts, not providers (human decision 2026-09-04), so
 * a second key for one provider can sit either side of another provider's
 * instead of being locked behind it.
 *
 * The WHOLE ROW is draggable. Because WCAG 2.2 AA requires a single-pointer
 * alternative for any author-controlled drag, every row ALSO carries
 * Move up / Move down buttons, and dnd-kit's KeyboardSensor makes the row
 * itself keyboard-draggable — so the list is fully operable without a
 * mouse.
 *
 * Only accounts the pipeline would ACTUALLY reach are listed: the server
 * filters to chat-capable providers and switched-on credentials (see
 * `resolveChain`), and the page prefetches so there is no loading flash and
 * no row-count guess in a skeleton.
 */

/** The account label for a row, or null when the provider holds no key. */
function accountFor(
  credentials: MaskedCredential[] | undefined,
  entry: ChainEntry,
): string | null {
  if (!entry.credentialId) return null
  const row = credentials?.find((c) => c.id === entry.credentialId)
  if (!row) return null
  if (row.label) return row.label
  for (const key of ["account_name", "account_email"]) {
    const value = row.metaData?.[key]
    if (typeof value === "string" && value.length > 0) return value
  }
  return null
}

function SortableEntry({
  entry,
  account,
  triedFirst,
  index,
  total,
  onMove,
}: {
  entry: ChainEntry
  account: string | null
  triedFirst: boolean
  index: number
  total: number
  onMove: (from: number, to: number) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id })

  return (
    <ChainEntryRow
      ref={setNodeRef}
      provider={entry.provider}
      account={account}
      active={entry.active}
      triedFirst={triedFirst}
      index={index}
      total={total}
      onMove={onMove}
      isDragging={isDragging}
      // transform/opacity only — animating layout properties would reflow
      // the whole list on every pointer move.
      style={{ transform: CSS.Transform.toString(transform), transition }}
      // The entire row is the drag target, not a grip button. `attributes`
      // carries the role/tabIndex dnd-kit's KeyboardSensor needs, so the
      // row stays keyboard-draggable too.
      dragProps={{ ...attributes, ...listeners }}
    />
  )
}

export function ExtractionChainCard() {
  const { data: chain, isPending, isError } = useExtractionChain()
  const { data: credentials } = useCredentials()
  const save = useSaveExtractionChain()
  /**
   * dnd-kit derives `aria-describedby` from a module-level counter, which
   * runs independently on the server and in the browser — the two disagree
   * and React reports a hydration mismatch. Attaching the sortable
   * behaviour only after mount makes the server HTML and the first client
   * render identical; the drag attributes then arrive as an ordinary
   * update. The markup is the same either way, so nothing moves.
   */
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const sensors = useSensors(
    // The whole row is draggable, so a generous threshold is what keeps a
    // click on the arrow buttons from registering as a micro-drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const items = chain ?? []

  const commit = React.useCallback(
    (next: ChainEntry[]) => {
      save.mutate(next, {
        onError: () =>
          toast.add({
            type: "error",
            title: "Could not save the fallback order",
            description: "Your previous order has been restored.",
          }),
      })
    },
    [save],
  )

  const move = React.useCallback(
    (from: number, to: number) => {
      if (to < 0 || to >= items.length) return
      commit(arrayMove(items, from, to))
    },
    [items, commit],
  )

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = items.findIndex((entry) => entry.id === String(active.id))
    const to = items.findIndex((entry) => entry.id === String(over.id))
    if (from < 0 || to < 0) return
    commit(arrayMove(items, from, to))
  }

  // "Tried first" belongs to the first row the pipeline would ACTUALLY
  // reach, which is not row 0 when row 0 is switched off.
  const firstActiveId = items.find((entry) => entry.active)?.id
  const rows = items.map((entry, index) => ({
    entry,
    index,
    account: accountFor(credentials, entry),
    triedFirst: entry.id === firstActiveId,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          Extraction priority
          {save.isPending ? <Spinner className="size-4" /> : null}
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          The order Relay tries your AI accounts in when extracting. The first
          one that answers wins; the rest are fallbacks for a rate limit or a
          dead key. Accounts from different providers can be interleaved however
          you like. Ones switched off in the Vault keep their place here but are
          skipped.
        </p>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <ChainSkeleton />
        ) : isError ? (
          <p className="py-4 text-destructive text-sm">
            Could not load your fallback order.
          </p>
        ) : items.length === 0 ? (
          <p className="py-4 text-muted-foreground text-sm">
            No usable accounts yet. Add an API key in the Vault and it will
            appear here.
          </p>
        ) : !mounted ? (
          // Same rows, same classes — only the drag wiring is absent.
          <ol className="flex flex-col gap-2">
            {rows.map(({ entry, account, triedFirst, index }) => (
              <ChainEntryRow
                key={entry.id}
                provider={entry.provider}
                account={account}
                active={entry.active}
                triedFirst={triedFirst}
                index={index}
                total={items.length}
                onMove={move}
                isDragging={false}
                dragProps={{}}
              />
            ))}
          </ol>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={items.map((entry) => entry.id)}
              strategy={verticalListSortingStrategy}
            >
              <ol className="flex flex-col gap-2">
                {rows.map(({ entry, account, triedFirst, index }) => (
                  <SortableEntry
                    key={entry.id}
                    entry={entry}
                    account={account}
                    triedFirst={triedFirst}
                    index={index}
                    total={items.length}
                    onMove={move}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  )
}

/** Mirrors the real row heights so nothing shifts on load (RULES.md). */
function ChainSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-lg border border-border bg-muted"
        />
      ))}
    </div>
  )
}
