"use client"

import * as React from "react"

import { StageTabContent } from "@/components/settings/stage-tab-content"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/toast"
import type { ChainEntry } from "@/lib/extraction/chain"
import { CHAT_STAGES, type ChatStage } from "@/lib/extraction/stages"
import { useCredentials } from "@/lib/query/credentials"
import { useChains, useSaveChain } from "@/lib/query/settings"
import { cn } from "@/lib/utils"

/**
 * Which AI account each pipeline step reaches for, and in what order
 * (Settings). One tab per step that makes its own model call — the tabs
 * render from CHAT_STAGES, so adding a step is one registry entry
 * (src/lib/extraction/stages.ts), never an edit here.
 *
 * Four steps, not five: `evidence_contract` is a prompt concatenated into
 * the extraction system prompt rather than a call of its own, so it has no
 * provider to choose and no tab.
 *
 * Every tab is a FLAT list of accounts, not providers, so a second key for
 * one provider can sit either side of another provider's. All four chains
 * arrive in one query, so switching tabs never reloads the order — only
 * the model list is fetched per tab, since that reads a catalog per
 * account.
 */

/** Each stage keeps its own accent, so the tabs are not one grey block. */
const TAB_ACCENT: Record<ChatStage, string> = {
  extraction:
    "data-active:bg-emerald-600 data-active:text-white dark:data-active:bg-emerald-600 dark:data-active:text-white",
  agent_router:
    "data-active:bg-violet-600 data-active:text-white dark:data-active:bg-violet-600 dark:data-active:text-white",
  schema_synthesizer:
    "data-active:bg-amber-600 data-active:text-white dark:data-active:bg-amber-600 dark:data-active:text-white",
  frames:
    "data-active:bg-sky-600 data-active:text-white dark:data-active:bg-sky-600 dark:data-active:text-white",
}

export function StagePriorityCard() {
  const { data: chains, isPending, isError } = useChains()
  const { data: credentials } = useCredentials()
  const save = useSaveChain()
  const [stage, setStage] = React.useState<ChatStage>("extraction")

  const commit = React.useCallback(
    (forStage: ChatStage, next: ChainEntry[]) => {
      save.mutate(
        { stage: forStage, chain: next },
        {
          onError: () =>
            toast.add({
              type: "error",
              title: "Could not save the order",
              description: "Your previous order has been restored.",
            }),
        },
      )
    },
    [save],
  )

  const active = CHAT_STAGES.find((entry) => entry.id === stage)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          AI priority
          {save.isPending ? <Spinner className="size-4" /> : null}
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Each step of the pipeline reaches for its accounts in its own order.
          The first that answers wins; the rest are fallbacks for a rate limit
          or a dead key. Accounts switched off in the Vault keep their place but
          are skipped.
        </p>
      </CardHeader>
      <CardContent>
        {isError ? (
          <p className="py-4 text-destructive text-sm">
            Could not load your priority order.
          </p>
        ) : (
          <Tabs
            value={stage}
            onValueChange={(next) => setStage(next as ChatStage)}
          >
            {/* One row at every width. Wrapping stretched whichever tab
                was orphaned onto the second line to full width, so the
                labels shorten instead (src/lib/extraction/stages.ts). */}
            <TabsList className="w-full">
              {CHAT_STAGES.map((entry) => (
                <TabsTrigger
                  key={entry.id}
                  value={entry.id}
                  className={cn(
                    "min-w-0 flex-1 px-2 transition-colors duration-200 sm:px-3",
                    TAB_ACCENT[entry.id],
                  )}
                >
                  <span className="sm:hidden">{entry.short}</span>
                  <span className="hidden sm:inline">{entry.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <p className="pt-3 text-muted-foreground text-xs">
              {active?.description}
            </p>

            {CHAT_STAGES.map((entry) => (
              <TabsContent
                key={entry.id}
                value={entry.id}
                className="fade-in animate-in pt-3 duration-200 motion-reduce:animate-none"
              >
                {isPending ? (
                  <ChainSkeleton />
                ) : (
                  <StageTabContent
                    stage={entry.id}
                    items={chains?.[entry.id] ?? []}
                    credentials={credentials}
                    onReorder={(next) => commit(entry.id, next)}
                  />
                )}
              </TabsContent>
            ))}
          </Tabs>
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
