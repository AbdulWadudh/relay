<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Codebase knowledge graph (graphify)

This repo is mapped into a knowledge graph at `graphify-out/graph.json`, which is **committed** — it is there on a fresh clone, no build needed. See README "Codebase knowledge graph".

**Query the graph before grepping or reading files** for any structural question — what calls X, what breaks if X changes, how two modules connect, where a concept lives. It traverses the graph instead of pulling source into context (measured ~12x fewer tokens per question on this repo).

```bash
graphify explain "admitRun"                 # a symbol's location, community, and every in/out edge — best for blast radius
graphify path "VaultPage" "withSourceCookies"   # shortest path between two concepts
graphify query "how does session auth work" --budget 6000   # broad traversal; default ~2000-token budget truncates
```

Rules:
- **The graph is a snapshot.** If it disagrees with the source, the source wins — verify any path you're about to act on before acting.
- Read-only. `explain` and `path` are cheap and precise; prefer them over `query`, which fans out and truncates.
- **After landing code, run `graphify update .`** — AST-only, no LLM, no API key, and it leaves the outputs untouched when nothing structural changed.
- `graphify update .` refreshes **code only**. If you changed a `.md` doc, the doc half of the graph is now stale and needs `/graphify . --update` in the agent (a semantic pass). Say so rather than silently leaving it stale.
- Never trigger a *full* rebuild (`/graphify .`, `graphify extract`) as a side effect of another task — it re-runs semantic extraction over every doc.
- `graphify-out/` is committed, so a refresh shows up as a tracked diff. Include it with the change that caused it; never commit it separately or without approval.
