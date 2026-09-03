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
import { ModelPicker } from "@/components/settings/model-picker"
import type { ChainEntry } from "@/lib/extraction/chain"
import type { AccountModels } from "@/lib/extraction/model-choice"
import type { ChatStage } from "@/lib/extraction/stages"
import type { MaskedCredential } from "@/lib/vault"

/**
 * One stage's fallback chain, sortable.
 *
 * Split from the card so all four tabs share one implementation — a tab
 * that reordered differently from its neighbour would be a bug nobody
 * would look for.
 *
 * The WHOLE ROW is draggable. Because WCAG 2.2 AA requires a
 * single-pointer alternative for any author-controlled drag, every row
 * ALSO carries Move up / Move down buttons, and dnd-kit's KeyboardSensor
 * makes the row itself keyboard-draggable — so the list is fully operable
 * without a mouse.
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
  model,
}: {
  entry: ChainEntry
  account: string | null
  triedFirst: boolean
  index: number
  total: number
  onMove: (from: number, to: number) => void
  model?: React.ReactNode
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
      model={model}
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

export function ChainList({
  stage,
  items,
  credentials,
  accounts,
  loadingModels = false,
  onReorder,
}: {
  stage: ChatStage
  items: ChainEntry[]
  credentials: MaskedCredential[] | undefined
  /** Per-account model data; absent until this stage's catalogs load. */
  accounts: AccountModels[] | undefined
  /** True while those catalogs are being read. */
  loadingModels?: boolean
  onReorder: (next: ChainEntry[]) => void
}) {
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

  const move = React.useCallback(
    (from: number, to: number) => {
      if (to < 0 || to >= items.length) return
      onReorder(arrayMove(items, from, to))
    },
    [items, onReorder],
  )

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = items.findIndex((entry) => entry.id === String(active.id))
    const to = items.findIndex((entry) => entry.id === String(over.id))
    if (from < 0 || to < 0) return
    onReorder(arrayMove(items, from, to))
  }

  if (items.length === 0) {
    return (
      <p className="py-4 text-muted-foreground text-sm">
        No usable accounts yet. Add an API key in the Vault and it will appear
        here.
      </p>
    )
  }

  // "Tried first" belongs to the first row the pipeline would ACTUALLY
  // reach, which is not row 0 when row 0 is switched off.
  const firstActiveId = items.find((entry) => entry.active)?.id
  const rows = items.map((entry, index) => {
    const models = accounts?.find((one) => one.entryId === entry.id)
    return {
      entry,
      index,
      account: accountFor(credentials, entry),
      triedFirst: entry.id === firstActiveId,
      // Only on a switched-ON row: a skipped account has no model in use,
      // and offering to pick one would suggest otherwise. Rendered even
      // before the catalog arrives so the slot reserves its width.
      model: entry.active ? (
        <ModelPicker stage={stage} account={models} loading={loadingModels} />
      ) : undefined,
    }
  })

  if (!mounted) {
    // Same rows, same classes — only the drag wiring is absent.
    return (
      <ol className="flex flex-col gap-2">
        {rows.map(({ entry, account, triedFirst, index, model }) => (
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
            model={model}
          />
        ))}
      </ol>
    )
  }

  return (
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
          {rows.map(({ entry, account, triedFirst, index, model }) => (
            <SortableEntry
              key={entry.id}
              entry={entry}
              account={account}
              triedFirst={triedFirst}
              index={index}
              total={items.length}
              onMove={move}
              model={model}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )
}
