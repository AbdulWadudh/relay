<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# RULES.md is binding — read it before writing code

`RULES.md` holds every standing decision a human has made about this repo: the
stack, the UI mandates, the scroll model, naming, and the circuit breakers that
say when to stop and ask. It wins over anything inferred from the surrounding
code, and over habit.

The ones most often broken by not knowing they exist:

- **List pages have ONE structure** (`RULES.md` § "List pages"). Runs, agents and
  credentials all compose `<ShellContent fill>` + `ScrollPanel` + `DataTable`.
  Only one element on the page scrolls, and it is never the page. Never size a
  list with a `calc(100svh - …)` height — that produced a two-scrollbar bug.
- **Max 250 lines per file**, and `src/components/ui/**` is vendored — compose
  over it, do not edit it.
- **Never commit without explicit approval**, and no `Co-Authored-By` trailer.
- **No hardcoding**: provider ids/labels come from `src/lib/providers.ts`, env
  from `src/config/index.ts`.

`LLM_STATE.md` is the companion log — what was tried, what was measured, and the
dead ends worth not repeating. Check it before re-litigating a decision.

`RUNBOOK.md` is what to read when production is broken: a triage order, what
each container does, the error-message table, and the approaches that were
tried and rejected with the evidence. **Start there for any "why is this
failing in prod" question** — it is faster than reading code and it records
which diagnostics are decisive versus merely plausible. `EGRESS_PROXY.md` is
the same depth for the YouTube proxy specifically.


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
