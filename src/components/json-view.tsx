"use client"

import { type JsonData, JsonEditor } from "json-edit-react"
import * as React from "react"

import { JsonPanel, onCopy, useCollapseAll } from "@/components/json-panel"
import { JSON_EDITOR_BASE } from "@/components/json-theme"

/**
 * The app's single JSON surface, wrapping `json-edit-react`.
 *
 * Relay is full of JSON a person actually has to read — a run's whole
 * `additional_data`, its extraction result, an agent's output schema — and
 * a `<pre>` dump of several hundred lines is not readable. Collapsible
 * nodes, a filter, expand/collapse-all and copy feedback live here so every
 * JSON surface in the app behaves identically.
 *
 * THE TREE SCROLLS ITSELF. Expanding a deep schema must not grow the panel
 * and hand its overflow to whatever contains it — inside a modal that means
 * the whole dialog body scrolls instead of the tree. The panel is capped
 * and owns a ScrollArea (RULES.md: the overflowing element owns its scroll,
 * and it is a ScrollArea, never a raw overflow div).
 */

/**
 * Read-only JSON. `collapse` is a DEPTH, not a boolean: a run's
 * `additional_data` nests deeply, and opening it fully by default means
 * scrolling past a whole transcript to reach anything else.
 */
export function JsonView({
  data,
  collapse = 1,
  searchable = true,
  filterLabel,
  maxHeight,
  className,
}: {
  data: unknown
  collapse?: number
  searchable?: boolean
  filterLabel?: string
  maxHeight?: string
  className?: string
}) {
  const [search, setSearch] = React.useState("")
  const { trigger, expandAll, collapseAll } = useCollapseAll()

  return (
    <JsonPanel
      filterLabel={filterLabel}
      search={search}
      onSearch={searchable ? setSearch : undefined}
      maxHeight={maxHeight}
      className={className}
      onExpandAll={expandAll}
      onCollapseAll={collapseAll}
    >
      <JsonEditor
        {...JSON_EDITOR_BASE}
        data={data as JsonData}
        viewOnly
        collapse={collapse}
        externalTriggers={trigger}
        searchText={search}
        searchFilter="all"
        enableClipboard={onCopy}
      />
    </JsonPanel>
  )
}

/**
 * Editable JSON, for an agent's schema and config. The component keeps the
 * tree internally and reports whole-value changes up, so the parent never
 * has to control it node by node.
 */
export function JsonInput({
  value,
  onChange,
  collapse = 2,
  maxHeight,
  className,
}: {
  value: unknown
  onChange: (next: unknown) => void
  collapse?: number
  maxHeight?: string
  className?: string
}) {
  const [error, setError] = React.useState<string | null>(null)
  const { trigger, expandAll, collapseAll } = useCollapseAll()

  return (
    <div className="flex min-w-0 flex-col gap-2 space-x-1">
      <JsonPanel
        maxHeight={maxHeight}
        invalid={Boolean(error)}
        className={className}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      >
        <JsonEditor
          {...JSON_EDITOR_BASE}
          data={value as JsonData}
          setData={(next) => {
            setError(null)
            onChange(next)
          }}
          onError={({ error: err }) => setError(err.message)}
          collapse={collapse}
          externalTriggers={trigger}
          enableClipboard={onCopy}
          showErrorMessages
        />
      </JsonPanel>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  )
}
