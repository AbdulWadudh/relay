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

import { ProviderOrderRow } from "@/components/settings/provider-order-row"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import {
  useExtractionOrder,
  useSaveExtractionOrder,
} from "@/lib/query/settings"

/**
 * Extraction provider priority (Settings).
 *
 * The WHOLE ROW is draggable. Because WCAG 2.2 AA requires a
 * single-pointer alternative for any author-controlled drag, every row
 * ALSO carries Move up / Move down buttons, and dnd-kit's KeyboardSensor
 * makes the row itself keyboard-draggable — so the list is fully operable
 * without a mouse.
 *
 * Only providers the user can actually use are listed; the server filters
 * them (see getExtractionOrder), and the page prefetches so there is no
 * loading flash and no row-count guess in a skeleton.
 */

function SortableProvider({
  id,
  index,
  total,
  onMove,
}: {
  id: string
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
  } = useSortable({ id })

  return (
    <ProviderOrderRow
      ref={setNodeRef}
      id={id}
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

export function ProviderOrderCard() {
  const { data: order, isPending, isError } = useExtractionOrder()
  const save = useSaveExtractionOrder()
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

  const items = order ?? []

  const commit = React.useCallback(
    (next: string[]) => {
      save.mutate(next, {
        onError: () =>
          toast.add({
            type: "error",
            title: "Could not save provider order",
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
    const from = items.indexOf(String(active.id))
    const to = items.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    commit(arrayMove(items, from, to))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          Extraction priority
          {save.isPending ? <Spinner className="size-4" /> : null}
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          The order Relay tries AI providers in when extracting. The first one
          you have configured wins; the rest are fallbacks.
        </p>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <ProviderOrderSkeleton />
        ) : isError ? (
          <p className="py-4 text-destructive text-sm">
            Could not load your provider order.
          </p>
        ) : !mounted ? (
          // Same rows, same classes — only the drag wiring is absent.
          <ol className="flex flex-col gap-2">
            {items.map((id, index) => (
              <ProviderOrderRow
                key={id}
                id={id}
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
              items={items}
              strategy={verticalListSortingStrategy}
            >
              <ol className="flex flex-col gap-2">
                {items.map((id, index) => (
                  <SortableProvider
                    key={id}
                    id={id}
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
function ProviderOrderSkeleton() {
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
