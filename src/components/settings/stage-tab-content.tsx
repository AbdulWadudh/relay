"use client"

import { ChainList } from "@/components/settings/chain-list"
import type { ChainEntry } from "@/lib/extraction/chain"
import type { ChatStage } from "@/lib/extraction/stages"
import { useStageModels } from "@/lib/query/settings"
import type { MaskedCredential } from "@/lib/vault"

/**
 * One tab's body, and its own component ONLY so `useStageModels` can be
 * called per stage. A hook cannot run inside the card's `.map()` over the
 * tabs, and hoisting it would read all four stages' catalogs to render the
 * one tab that is open.
 */
export function StageTabContent({
  stage,
  items,
  credentials,
  onReorder,
}: {
  stage: ChatStage
  items: ChainEntry[]
  credentials: MaskedCredential[] | undefined
  onReorder: (next: ChainEntry[]) => void
}) {
  const { data: accounts } = useStageModels(stage)

  return (
    <ChainList
      stage={stage}
      items={items}
      credentials={credentials}
      accounts={accounts}
      onReorder={onReorder}
    />
  )
}
