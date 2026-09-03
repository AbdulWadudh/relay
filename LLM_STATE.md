# LLM Execution State - Relay

- **Current Phase:** **Production outage FIXED and deployed (commit `580f0e1`).** Session Auth Phases 4 and 5 plus Gemini extraction are complete but UNCOMMITTED and awaiting approval. Phases 0-3 are committed; `1104047` (Phase 3) reached production for the first time with this deploy. Next: the real human sign-in — now actually possible, because the capture service had never run in production at all. Then the Phase 6 instaloader decision, which is gated on it.
- **Completed Phases:** PRD, TRD, Agent Rules, Design Guidelines, Branding, **Task 1: Foundation & Database**, **Task 2: Credentials Dashboard & Notion Ray**, **Task 3: Agent Management System**, **Task 4.1: Media Ingest**, **Task 4.2: Run Persistence & Queue**, **Task 4.3: Transcription**, **Task 4.4: Agent Routing & Extraction**, **Task 4.5: Evidence Verification**, **Task 4.6: Document Tree & Notion Publish**

## Tooling — graphify knowledge graph (2026-09-02) — DONE, docs only, AWAITING APPROVAL

Mapped the repo into a queryable knowledge graph so structural questions
(what calls X, what a change touches) are answered by traversal instead of
reading source into context. Measured 12.0x fewer tokens per query
(~106,866 naive → ~8,916 per query).

Built: 1,603 nodes, 3,787 edges, 110 communities from 243 files — code via
tree-sitter AST (no API key, no LLM), the 11 `.md` docs and 2 logo assets via
a semantic pass. Community labels were written by hand and survive
`graphify update`.

### One real gap the tool caught

The first AST pass warned that all 7 `drizzle/*.sql` migrations contributed
nothing — `tree_sitter_sql` is not in the base install. Re-ran with
`uv tool install "graphifyy[sql]"`, which recovered 17 migration nodes. Worth
knowing on any reinstall: the base package drops the schema with a warning,
not an error.

### Known limitations, recorded rather than smoothed over

- `graphify update .` refreshes **code only**. A `.md` edit needs
  `/graphify . --update` (semantic pass), or the doc half goes stale silently.
- The health check reports 321 dangling-endpoint edges (edges pointing at
  endpoints no node defines) — real coverage loss. The 55/59 "collapsed"
  edges are benign: barrel files emit both `imports_from` and `re_exports`
  between the same pair and merge into one undirected edge.
- `cost.json` records 316,525 tokens as input with 0 output. The Agent tool
  reports one combined figure per subagent, not a split — the total is right,
  the output column is not.

### Not code

No `src/` file changed; `bun run typecheck` passes with 0 errors. Changes are
`AGENTS.md`, `README.md`, `RULES.md`, `CHANGELOG.md`, `.gitignore` and this
file, plus the ~2.3MB of `graphify-out/` artefacts now tracked. That is over
the 3-file circuit breaker; flagged rather than hidden.

### The graph is committed — reversal of a first call

Initially gitignored the whole of `graphify-out/`. That was wrong, and the
human pushed back: the point is that everyone can use it. Checked instead of
arguing — `graph.json`, `manifest.json`, `GRAPH_REPORT.md`,
`.graphify_labels.json` and `cache/` contain **zero** absolute paths
(`source_file` is relative, e.g. `SESSION_AUTH.md`), and graphify ships a
`merge-driver` for union-merging two `graph.json` files, which only exists if
the file is meant to be committed. Only `.graphify_python` (72B) and
`.graphify_root` (17B) are machine-specific.

So: commit the graph, the 250KB semantic cache (or every clone re-spends
~316k tokens), the manifest (relative by design, keeps a teammate's `update`
incremental), the labels and the report. Ignore the two absolute-path
sidecars, `cost.json` (appends per run — would conflict constantly), and
`graph.html` (1.5MB, churns wholesale, regenerates in ~1s from graph.json).

Consequence to watch: a graph refresh is now a tracked diff, so it belongs in
the same commit as the change that caused it. Do **not** install
`graphify hook install` — it rebuilds *after* the commit lands and would leave
`graph.json` permanently dirty.

## Task 6 — deploy readiness (2026-09-02) — PARTLY DONE, one item needs a decision

### DONE: the capture service can now actually run in a container

See the outage section above. Before this, capture had never executed in
production at all, and even once it did it could not have opened a browser
(`xauth`, `chromium-sandbox`, seccomp). All three fixed and verified by
launching a real sandboxed Chromium inside the container.

### DONE: a dedicated CAPTURE_INTERNAL_TOKEN

Already correct and now confirmed against the live compose: both `relay`
and `capture` take `${CAPTURE_INTERNAL_TOKEN:?generate one with openssl
rand -hex 32}`, so compose REFUSES to start without it and the VAULT_KEY
fallback in `src/config` is unreachable in a deploy. Verified behaviourally
that the control plane rejects a request without it (`401`), and that the
comparison is constant-time (`src/lib/capture/server.ts`).

### DONE: yt-dlp bump cadence, with a real acceptance test

`bun run verify:ytdlp` (`scripts/verify-ytdlp.ts`). It reproduces the §1.1
measurement rather than checking that yt-dlp merely runs: for each fixture
it tries the DEFAULT client and then each client in
`config.media.ytDlpFallbacks`, doing a REAL media fetch — a `--simulate`
check would pass while every real run 403s, which is the whole trap §1.1
documents. Exits non-zero if any fixture is unreachable by every client.

Run it against the pinned version and the candidate before touching
`YT_DLP_VERSION`; yt-dlp warns once a build is >90 days old, and that
warning is the trigger.

First run, on the pinned `2026.03.17`, reproduces §1.1 exactly:

```
chain:  default -> web_embedded -> mweb -> tv_simply
PASS  dQw4w9WgXcQ    default=403  web_embedded=OK(11552KB)
PASS  9bZkp7q19f0    default=403  web_embedded=OK(3897KB)
PASS  n5t23nvU_t0    default=403  web_embedded=OK(1175KB)
PASS  T-1iAFMZunY    default=OK(577KB)
PASS  MGIovezvFSQ    default=OK(719KB)
PASS  afZpm4LVjG0    default=OK(154KB)
note: never needed or never worked -> mweb, tv_simply
PASSED: all 6 fixtures reachable.
```

Still 3 of 6 failing on the default client — the fallback chain is load
bearing, not legacy. `mweb`/`tv_simply` are untested in practice because
`web_embedded` always wins first; they are insurance, not dead config.

### DONE: a silent failure in CAPTURE_PUBLIC_URL

`config.capture.publicUrl` used `??`, but docker-compose passes
`CAPTURE_PUBLIC_URL: '${CAPTURE_PUBLIC_URL}'`, which expands to an EMPTY
STRING when the variable is unset in Coolify rather than being absent. `??`
only catches null/undefined, so the empty string sailed through and
`src/server/capture.ts` handed the browser a RELATIVE `/stream?ticket=...`
— which resolves against the app's own origin, so the socket opens against
Next.js, which cannot upgrade it. Now `||`. Demonstrated both ways before
and after.

### NOT DONE: the public wss:// route — needs a hostname decision

`CAPTURE_PUBLIC_URL` is still unset in Coolify and the `capture` service
uses `expose:` only, so there is NO public route and the browser cannot
reach `/stream`. Capture therefore still cannot complete a sign-in in
production even though the service now runs.

What it needs: a public host (the server has a `*.<wildcard-domain>` wildcard;
`<app-domain>` and `relay-db.<wildcard-domain>` are the existing pattern)
pointed at `capture:3002`, with `CAPTURE_PUBLIC_URL` set to that ORIGIN —
no path, no trailing `/stream`.

**The trap to avoid:** Coolify renders a domain into Caddy's `handle_path`,
which STRIPS the matched prefix. A path-scoped domain like
`https://host/stream:3002` would forward `/stream` to the service as `/`,
which does not match the `/stream` route and falls through to the
token-gated control plane — a `401` that looks like an auth bug. Either
route the host without a path (control endpoints stay reachable but remain
token-gated), or use `handle` rather than `handle_path` via explicit
labels. Not yet verified which Coolify emits for a path-scoped domain.


## PRODUCTION OUTAGE — a Dockerfile stage boundary (2026-09-02) — FIXED, COMMITTED `580f0e1`, DEPLOYED

The app was `exited:unhealthy` in Coolify and served Cloudflare 525.

### What the evidence said

`restart_count: 10`, `last_restart_type: "crash"`, `max_restart_count: 10`,
`last_online_at: 22:30:39` against a deploy that FINISHED at 22:28:53. So:
the build was fine, the app started fine, then something crash-looped ten
times and Coolify stopped the whole resource — taking the healthy web
container down with it. Every other app on the host was healthy.

### Root cause: three instructions in the wrong stage

`COPY package.json/src/scripts/...`, `EXPOSE 3000` and the
`db:migrate && next start` CMD were at the END of the Dockerfile, which is
**after** `FROM runtime AS capture`. Every instruction following a `FROM`
belongs to that stage, so all three belonged to `capture`. Verified by
building each stage:

| Stage | Before the fix |
| --- | --- |
| `runtime` | `CMD ["/usr/local/bin/bun"]` (base-image default), `/app` held `node_modules` only — no src, no package.json. An unusable stage. |
| `capture` | `CMD ["sh","-c","bun run db:migrate && exec bun --bun next start ..."]` — a stage keeps only its LAST CMD, so `bun scripts/capture.ts` was overridden. |

Consequences, all silent:

1. `relay` and `worker` declare no build `target`, so Docker built the LAST
   stage — `capture`. **Both have been shipping the 3.3GB Chromium image**,
   running as the `capture` user. That is also the only reason they worked,
   since the real CMD lived there.
2. **The capture service has NEVER run in production.** It was a second
   Next.js server. Its healthcheck probes `:3002/health`, so it was
   permanently unhealthy, and it ran `bun run db:migrate` concurrently with
   `relay` on every start — the exact concurrent-migration race recorded
   below as a past outage cause. That crash-loops, Coolify counts restarts
   at the RESOURCE level, hits 10, and stops everything.

This also explains why "capture is unproven in production" stayed true: it
was never executing.

### The fix

The COPY/EXPOSE/CMD block moved above the capture stage; `relay` and
`worker` pin `target: runtime`; capture's `CMD` is now the file's last line
with a comment saying why it must stay there.

### Capture could not have launched a browser anyway

Two packages `--no-install-recommends` drops, both measured by running the
stage:

- **`xauth`** — `xvfb-run` shells out to it, and without it every launch
  died at `xvfb-run: error: xauth command not found`. The build's smoke
  test ran `Xvfb -help`, which passed while the real launcher was broken;
  it now tests `xvfb-run` itself.
- **`chromium-sandbox`** — Debian splits Chromium's setuid helper into its
  own package. Without it: `No usable sandbox!`, the message that makes
  people reach for `--no-sandbox`.

Then Docker's default seccomp profile denied `clone(CLONE_NEWUSER)`
(`Failed to move to new namespace ... Operation not permitted`). The
capture service now runs `seccomp:unconfined` with `cap_drop: ALL`, which
was verified sufficient — the sandbox starts with ZERO capabilities.

**Why that is the safer half of the trade, not a downgrade:** Chromium
installs its OWN seccomp-bpf filter on every renderer, and that policy is
tighter for this workload than Docker's generic default. The untrusted
third-party page content stays confined either way; relaxing the
container-level filter is what allows Chromium to apply its own. The
alternative, `--no-sandbox`, would run renderers with the container's full
privileges.

### Verified in a container, not asserted

`runtime` builds slim with the correct CMD and no Chromium. `capture` boots
(`Capture server listening`), `/health` returns `{"status":"ok"}`, an
unauthenticated control call is `401`, and `POST /sessions` launched a real
headful sandboxed Chromium — **13 processes, zero sandbox / namespace /
xauth errors**.

### A wrong turn, recorded because the reflex was wrong

The first hypothesis was that `createRedis()` never attached an `error`
listener, so an ioredis connection blip would crash the process. **Tested
and false**: ioredis registers its own fallback, prints
`[ioredis] Unhandled error event`, and the process SURVIVES. A listener was
added anyway — it routes those errors to the structured logger instead of
raw stderr — but it is NOT the outage cause and must not be recorded as one.


## Session Auth Phase 5 — budgets and fairness (2026-09-02) — AWAITING APPROVAL

Three locks, none of which can FAIL a run. Over budget is a "later", not a
"never": the job is delayed and `relay_runs` keeps the row at `queued`.
All of it lives in `src/lib/queue/admission.ts`, checked by the worker
before `processRun`.

### 1. Per-user slot — fairness

`config.queue.concurrency` is one global number, so one user submitting 20
URLs occupied every slot. BullMQ OSS has no job groups and its `limiter` is
global rather than per-key, so this is a Dragonfly semaphore:
`SET {relay:user:<id>}:slot:<i> <runId> NX PX <ttl>`, tried across
`perUserConcurrency` slots. The `PX` TTL (30 min) is the crash net — a
worker killed mid-run releases by expiry instead of wedging that user.

**The knob is real, not decorative.** An earlier cut hard-coded a single
slot while exposing `perUserConcurrency` in config, which would have been a
setting that silently did nothing.

### 2. Per-credential jar lock — correctness, and why it is SEPARATE

Two runs sharing one cookie jar both write the rotated jar back on exit,
and the loser can invalidate a live session. `SESSION_AUTH.md` §5.4 handles
this by noting that raising `perUserConcurrency` above 1 requires re-keying
the semaphore onto the credential — a comment someone has to remember.

It is now structural instead: a cookie-bearing run takes a SECOND lock on
`{relay:cred:<id>}:lock`, so the guarantee holds at any concurrency. An
anonymous run takes neither that lock nor a budget charge, because it
touches nobody's account. Its refusal reason is `jar_busy`, distinct from
`user_busy` — at concurrency 1 they look identical, but they are different
problems the moment the knob moves.

### 3. Per-credential rate budget — 10/hour, 50/day

Keyed on the CREDENTIAL, not the user: the account is what gets flagged,
and a user may hold several. Implemented as an exact ROLLING window (a ZSET
of request timestamps), not a fixed bucket — a fixed hourly bucket lets a
user spend the whole budget at :59 and the whole next one at :00, which is
exactly the burst shape that gets an account flagged. The rolling window
also makes "when does room appear?" exact: the moment the oldest entry ages
out. Both windows are checked before either is charged, so a run the daily
cap rejects does not spend an hourly token.

### How the deferral works

`job.moveToDelayed(retryAt, token)` then `throw new DelayedError()`. The
worker holds a lock on the job while processing, so `moveToDelayed` needs
the token to release it, and `DelayedError` is what stops BullMQ from then
completing or failing the job. **A deferral does not consume an attempt** —
verified, not assumed.

### Verified against real Dragonfly and the real worker

- **User slot:** run A admitted; run B refused `user_busy` with a 2000 ms
  retry while A held it; B admitted the moment A released.
- **Jar lock is independent:** at `QUEUE_PER_USER_CONCURRENCY=2` two
  anonymous runs were both admitted, but two runs sharing one credential
  were not — the second came back `jar_busy`, and was admitted once the
  first released. At the default of 1 the user slot would have masked this,
  which is why the test raises it.
- **Rate budget:** with the default 10/hour, runs 1-10 admitted and 11 and
  12 came back `rate_budget` with `retryIn≈60min`.
- **Worker defers without burning an attempt:** the user's only slot was
  held by a foreign owner, then a run enqueued. `jobState=delayed`,
  `attemptsMade=0`, `runStatus=queued`, and the worker logged `Run deferred
  reason=user_busy` three times at 2 s intervals. On release the run
  executed ONCE (`attemptsMade=1`) and the slot was returned — 0 stray
  admission keys left in Dragonfly.
- **Rate budget through the worker**, started with `SOCIAL_RATE_PER_HOUR=1`
  and a cookie credential present: run 1 spent the token and ran
  (`attemptsMade=1`, `SESSION_EXPIRED` — Phase 4 again, via the real
  worker); run 2 `jobState=delayed attemptsMade=0 runStatus=queued`,
  `job.delay=3595873` (~60 min).

### Cost, and the one thing to watch

A `user_busy` deferral re-polls every `QUEUE_DEFER_MS` (2 s), so a queued
run costs one admission check every 2 s while it waits. That is the design
in §5.4 and is fine on one VPS; it is the first thing to revisit if the
queue ever gets deep, because it is per queued run, not per worker. A
`rate_budget` deferral does NOT spin — its retry is up to an hour out.


## Session Auth Phase 4 — `SESSION_EXPIRED` (2026-09-02) — AWAITING APPROVAL

A dead jar used to fail as `SOURCE_UNAVAILABLE` ("this isn't publicly
downloadable"), sending the user to investigate a video that was fine. It now
fails as `SESSION_EXPIRED`, once, and the Vault row offers Reconnect.

### What shipped

- `IngestErrorCode` gains `SESSION_EXPIRED` (`src/lib/media/errors.ts`).
- `downloadWithYtDlp` branches on `cookiesPath && UNAVAILABLE.test(stderr)`.
  The message is OURS and never carries stderr — `lastLine()` puts 400 chars of
  raw stderr into the user-visible `run.error`, so a tool that ever echoed a
  cookie into stderr would land it in the run record.
- **The `CLIENT_REFUSED` (403) branch moved AHEAD of the login-shaped branch.**
  A 403 means the same thing with or without a jar (the GVS/SABR case of §1.1),
  so it must never be reported as a dead session.
- `isPermanent` promotes it, so BullMQ raises `UnrecoverableError` instead of
  burning the attempt budget on a jar that is dead the same way twice.
- Reject bookkeeping in `additional_data` via `recordSessionOutcome`
  (`src/lib/vault-secrets.ts`): a rejection increments `reject_count` and sets
  `last_rejected_at`; a success resets to 0 and sets `last_verified_at`.
- `MASKED_COLUMNS` now SELECTS `additional_data` but `toMasked` reduces it to a
  single derived `stale` boolean and drops the object. The raw counter never
  reaches the API; anything added to `additional_data` later stays off the wire
  by default rather than by someone remembering to omit it.
- Vault row: an amber Reconnect action (`text-amber-700 dark:text-amber-300`,
  per the light-mode contrast rule) plus an "Expired" badge, both gated on
  `stale`. Row-scoped per `RULES.md:60`.
- `config.social.staleAfterRejects` (default 2) + `SOCIAL_STALE_AFTER_REJECTS`.

### A real bug this found — write-back on a FAILED download

`persistRotation` ran in a `finally`, so it persisted the jar yt-dlp left
behind **even when the download failed**. Measured 2026-09-02 with
`--cookies` on a failing fetch: yt-dlp rewrites the jar on every exit, and the
file it leaves after a failure is the anonymous cookie set that request
received — the original `SID` is simply not in it. So a failed run overwrote
the stored credential with the product of a request that did not work.
Write-back is now gated on success; a failure keeps the last jar that worked.

**Not settled, and it matters for Task 4:** the `SID` in that test was bogus
(`deadbeef`), so YouTube most likely cleared it server-side. Whether a jar
holding a REAL session survives yt-dlp's rewrite is still unmeasured. Check it
during the first real sign-in — if a valid session cookie also disappears,
rotation write-back is not a freshness feature but a destructive one.

### Verified for real, not asserted

- **Classification**, against real yt-dlp on `youtube.com/shorts/aBcDeFgHiJk`
  ("This video is unavailable", no 403):
  - no jar  -> `SOURCE_UNAVAILABLE`, permanent=true
  - with jar -> `SESSION_EXPIRED`, permanent=true, message
    *"Your YouTube session has expired. Reconnect it in the Vault..."*
- **One attempt, not two**, through the real queue with the worker running
  (`config.queue.attempts` is 2). Worker log:
  `"code":"SESSION_EXPIRED","permanent":true` then
  `"attempts_made":1,"msg":"Run job failed"`.
- **Bookkeeping**, against the real DB with a scratch cookie credential:
  round 1 -> `{"reject_count":1,...}`, API `stale=false`;
  round 2 -> `{"reject_count":2,...}`, API `stale=true`. Deleted afterwards.
- **Browser**, via a minted+signed `auth_sessions` cookie, at 1280 dark, 1280
  light and 380 mobile: Session + Expired badges and the Reconnect action all
  render, nothing truncates on mobile, the amber icon reads on white. Clicking
  Reconnect produced a real `Capture session started` in the log — the dialog
  is wired; its stream cannot render inside a headless automation browser,
  which is Phase 2 behaviour and not new.

### Not covered by this phase

`source.label` names one ITEM ("YouTube Short"), so the platform name in the
message comes from `providerLabel(source.source)` — a social credential's
`provider` IS the media source id (§2.4), so no mapping table was needed.

Instagram still routes to instaloader, which ignores the jar entirely, so
`SESSION_EXPIRED` is currently reachable only on the yt-dlp path. That is
correct today and is what Phase 6 decides.


## Session Auth Phase 2 — capture service (2026-09-02)

Built and committed in four slices. The whole flow works end to end from a
cold start; what has NOT happened is a real human sign-in with real
credentials, which is the only thing left to prove.

### Architecture, and why it is a third process

`scripts/capture.ts` runs alongside the web app and the worker. Two reasons,
neither stylistic: **Next.js route handlers cannot upgrade a request to a
WebSocket** (`hono/vercel`'s `handle()` returns a Response), and the
concurrency cap is only enforceable if exactly ONE process owns the map of
live browsers. Next.js would run several workers, each with its own idea.

### Security, all verified behaviourally rather than asserted

- **The CDP port is unauthenticated** — whoever reaches it owns the browser.
  Bound to loopback on an ephemeral port, never published, never logged.
- **Chromium's sandbox is ON.** The Docker stage creates an unprivileged
  `capture` user to sandbox into; running as root is exactly what pushes
  people to `--no-sandbox`, which would put a renderer exploit on the host.
- **Socket auth is three checks**: Origin matches the app, the ticket
  redeems exactly once (atomic GETDEL, 60s), and the named session belongs
  to the ticket's user. Ownership is re-checked on every message too.
- **Navigation is fenced** to the provider's domains. Unfenced, an
  authenticated user could steer a server-side browser into the VPS's
  private network — SSRF with a keyboard attached.
- **Every socket frame is Zod-validated** before reaching CDP; malformed
  frames are dropped silently rather than echoed (an echo is an oracle).
- **The browser is spawned with a stripped env**, so `VAULT_KEY` and the
  database token never enter a process rendering third-party pages.
- Probed: control plane 401 without/with wrong token; `/stream` 401 on
  absent, garbage and oversized tickets; bad provider 400, not a crash.

### Three real bugs, all found by testing rather than review

1. **`--user-data-dir` was RELATIVE.** Chrome resolves that against its own
   cwd, popped a "cannot read and write to its data directory" dialog on the
   host, and fell back to another profile — which risks the capture browser
   touching the operator's real Chrome profile and its cookies. Caught only
   because the human screenshotted the dialog; the smoke test had reported
   six green checks. Now absolute, created up front, and the test asserts
   Chrome actually POPULATED our profile rather than only that it was
   cleaned up.
2. **The first sign-in after every deploy would have failed.** ioredis
   connects lazily and the shared client sets `enableOfflineQueue:false`, so
   the first `redeemTicket` after a process start issued GETDEL before the
   socket was ready and threw. Tickets now use their own client with the
   offline queue ON — a ticket read is not a job enqueue.
3. **A failed ticket orphaned a live browser.** The session is created
   before the ticket is minted, so a Redis blip left ~400MB running with
   nothing able to connect, burning a slot until the sweeper ran 90s later.
   The route now tears it down explicitly. Observed, including the follow-on
   capacity rejection of the next request.

### Verified

Cold start of both processes: first session 201, first socket connected, 58
frames streamed from the real Instagram login page under ack backpressure,
the same ticket REJECTED on reuse, session disposed to 0 on socket close.
Separately: the sweeper reclaims an orphan (reason `idle`); real Chrome
launches, attaches, streams, exposes `Storage.getCookies`, and is torn down
with its profile removed; the Netscape jar the serializer produces is parsed
by real yt-dlp with no format error.

### NOT yet done

- **A real human sign-in and harvest.** Everything up to "the jar would be
  written" is proven; storing an actual Instagram/YouTube session is not.
- Phases 3-6: authenticated downloads, session lifecycle (`SESSION_EXPIRED`),
  per-credential budgets and per-user fairness, instaloader consolidation.
- `CAPTURE_PUBLIC_URL` needs a real wss:// route in Coolify; only `/stream`
  should be exposed, never the control endpoints.

## Gemini wired for extraction (2026-09-02) — AWAITING APPROVAL

Closes the TODO below. Gemini had a key in the vault but no `ChatProvider`
entry, so `chatProvider("gemini")` was null and it never appeared in the
order list.

### What shipped

- Registry entry on the OpenAI-COMPATIBLE surface
  (`https://generativelanguage.googleapis.com/v1beta/openai`), so it needs
  no special client.
- A `capabilities` fallback. Its rows really are
  `{id, object, owned_by, display_name}` — no context, no features, no
  `created` — so without one, `structured` is false for every model and
  chat.ts would never send `response_format: json_schema`.
  `contextLength: 32_768` is a conservative FLOOR, not a claim about any
  model's real window.
- `versionScore(id)` in models.ts, a sibling of `parameterCount`, used as
  the LAST tiebreaker — below `created`, above `id.localeCompare`. Below
  `created` on purpose: where a provider publishes real dates they are the
  better recency signal, so this only engages for catalogs that publish
  none. It rejects dates (`-04-2026`) and sizes (`-26b`), and takes the
  FIRST version token because that is the family version.
- Placed after Groq in `EXTRACTION_ORDER`. Groq is MEASURED at ~5s; Gemini
  is not timed, so it does not displace it. Only the default — a saved user
  order wins and new providers are appended, not promoted.

### The ranking damage was worse than this file recorded

The note below predicted retired `gemini-2.5-*` models sorting ahead of
`3.6`. Measured, the top four were actually `gemma-4-31b-it`,
`antigravity-preview-05-2026`, `aqa`, `deep-research-max-preview-04-2026` —
alphabetical order put three NON-CHAT models ahead of every Gemini model,
so all four `MAX_CANDIDATES` were garbage. After `versionScore` the top
four are `gemma-4-31b-it`, `gemini-3.7-flash`, `gemini-3.6-flash`,
`gemini-3.5-flash` — all live, all verified schema-valid at 1.6-2.9 s.

### No regression, proven rather than assumed

Groq, OpenRouter and Ollama Cloud were ranked with the shipped comparator
and with the pre-`versionScore` one, and the FULL ordered lists diffed:
**IDENTICAL** for all three. They publish real `created` values, so the new
tiebreaker is never reached.

### Two real bugs found on the way, both fixed

1. **A 5xx killed the whole extraction.** `disposition`
   (`src/lib/extraction/chat.ts`) fell through to `"fail"` for any status
   it did not name, so one transient `503` on the top candidate ended a run
   with three usable models queued behind it — observed live on
   `gemini-3.7-flash`. Now `>= 500` is `"next-model"`. Not
   `"next-provider"`: a busy model is not a busy provider, and if they all
   503 the pass moves on by itself. Verified — a later run logged
   `skipped=[models/gemini-3.7-flash]` and answered on 3.6.
2. **`isolate()` could not strip an UNTERMINATED trailing fence.**
   `src/lib/extraction/validate.ts` short-circuited on
   `body.startsWith("{")` and returned the body verbatim, so a model that
   emits a valid object followed by a bare closing ``` (measured:
   `gemma-4-31b-it`) failed to parse on the backtick. It now always slices
   first `{` to last `}`, the same way leading prose was already handled.
   Checked against 8 cases including balanced fences, leading and trailing
   prose, nested braces and a `}` inside a string.

### A wrong turn worth recording

An earlier cut of this work added a provider-level `excludes` regex and
used it to drop `gemma-*`, on the evidence that gemma replied *"no schema
was provided in the prompt"* three times running. **That evidence was a bug
in the verification harness, not in gemma.** `runChat` takes the RAW JSON
Schema and wraps it itself (`chat.ts:197` -> `client.ts:80`); the harness
passed an already-wrapped `{name, schema}`, which double-wrapped into a
schema with no `type`. Gemma was describing the broken schema accurately.

Re-tested with the exact production payload, `gemma-4-31b-it` and
`gemma-4-26b-a4b-it` honoured the schema **6 times out of 6**, and through
the real `runChat` path 3 of 3 with no skips. The `excludes` mechanism was
REMOVED along with the exclusion — with its only justification gone it was
speculative machinery, and it had come uncomfortably close to permanently
hiding a working model on a false measurement.

**The lesson, since it will recur:** when a model claims the request was
malformed, check the request before blaming the model.

### One state change to be aware of

Forcing the order to Gemini for the live test required writing the
`extraction_order` user setting and restoring it. The restore wrote the
RESOLVED list, so the stored row is now
`["ollama-cloud","groq","openrouter","ollama","gemini","openai"]` where it
previously omitted the trailing two. `resolveExtractionOrder` appends
missing providers anyway, so the effective order is unchanged — but the row
is now explicit rather than inferred.


## RESOLVED: enable Gemini for extraction (logged 2026-09-02, human decision)

Gemini has a key in the vault but is deliberately hidden from the extraction
order list, because `chatProvider("gemini")` is null — it has no entry in
`src/lib/extraction/providers.ts`. It is NOT a limitation; it was never wired.

Verified against the live API with the user's own key:
- `GET https://generativelanguage.googleapis.com/v1beta/openai/models` → **200**, 53 models.
- `POST .../chat/completions` with `models/gemini-3.6-flash` and a
  `response_format: json_schema` → **200**, returned schema-valid JSON.

Three things it needs, and the third is the non-obvious one:
1. A `ChatProvider` entry (`baseUrl: https://generativelanguage.googleapis.com/v1beta/openai`).
2. A `capabilities` fallback — its rows are `{id, object, owned_by, display_name}`
   only: no context length, no feature list, and **no `created`**.
3. **Version-aware ranking.** The catalog still lists retired `gemini-2.5-*`
   models (`"no longer available to new users"`, 404 on use). With no size in
   the id and no `created` to sort on, `rankModels` falls through to
   `id.localeCompare`, which puts `2.5` BEFORE `3.6` — so all four
   MAX_CANDIDATES could burn on dead models before reaching a live one.
   Parsing a version out of the id (a sibling of `parameterCount`) is the
   generic fix, and would also help `llama-3.3` vs `llama-3.1`.

## Browser verification (2026-09-02) — the gap is now closed

Previously unverified because agent-browser could not authenticate. Solved by
minting an `auth_sessions` row and signing the cookie with better-auth's own
`makeSignature` (`better-auth/crypto`) — the raw token is rejected, the cookie
is `${token}.${hmac}`. Recorded here because it is the only way to drive the
authenticated UI in a browser.

Checked at 1280×900 dark, 1280×900 light, and 380×844 mobile. **Two real bugs
this caught, both now fixed:**

1. **Hydration mismatch in `ProviderOrderCard`.** dnd-kit derives
   `aria-describedby` from a module-level counter that runs independently on
   server and client, so React reported a mismatch on every load. The sortable
   behaviour is now attached only after mount — identical markup either way, so
   nothing moves.
2. **"Ollama Cloud" truncated to "Olla…" at 380px.** The "Tried first" badge
   plus both arrow buttons squeezed the provider name out. The badge is now
   `hidden sm:inline-block`; the top position already carries its meaning.

## Ollama (local + cloud), provider ordering UI, per-phase models (2026-09-02) — UNCOMMITTED

Human asked for Ollama during Session Auth Phase 1; approved dnd-kit and a new
`user_settings` table explicitly. **Session Auth is paused mid-Phase-1** (see below).

### Ollama

- **Both modes are OpenAI-compatible, verified 2026-09-01.** Local:
  `http://127.0.0.1:11434/v1`. Cloud: `https://ollama.com/v1` — `GET /v1/models`
  returns 200 with an OpenAI-shaped list, `POST /v1/chat/completions` returns 401
  without a bearer. So cloud is ordinary BYOK and needed no special client.
- **Local is keyless and OFF by default** (`OLLAMA_LOCAL_ENABLED`). Keyless would
  otherwise look "configured" in production and burn an attempt per run
  connecting to nothing. `ChatProvider.keyless` short-circuits the vault lookup
  and sends Ollama's documented placeholder bearer.
- **Ollama's `/v1/models` advertises NOTHING** — no context, no features. Added
  `ChatProvider.capabilities` as a provider-level fallback, applied in
  `normaliseCatalog` only where the row was silent. CORRECTION to a claim made
  mid-session: those models are NOT filtered out without it (`rankModels` waives
  its checks when no model in a catalog publishes capabilities). The real loss is
  `structured: false`, which silently drops schema-constrained decoding that
  Ollama does implement. `CATALOG_VERSION` bumped 3→4.
- **`OLLAMA_CONTEXT_LENGTH` matters and is not the model's max.** gemma4:12b
  advertises 262144; a default `ollama serve` loaded it at **4096**. Must be set
  on the server and mirrored in `config.ollama.contextLength`.
- **gemma4:12b is a thinking model.** With a small `max_tokens` it spends the
  budget on `reasoning` and returns EMPTY content — exactly the failure at
  LLM_STATE.md:20. Safe here only because `llm/client.ts` sends no `max_tokens`.
- **LOCAL Ollama full-pipeline verification: SKIPPED (human decision 2026-09-02).**
  Cloud is the path in use. Proven for local: provider ordering, catalog ranking
  selecting gemma4:12b, and schema-valid JSON from `/v1` — but never a full run.
- **402 IS PER-MODEL ON OLLAMA CLOUD, NOT PER-ACCOUNT.** The ranker picked
  `mistral-large-3:675b` → 402 "requires a subscription", and `disposition()`
  read 402 with OpenRouter's account-wide meaning and abandoned the whole
  provider. New `ChatProvider.billing: "account" | "per-model"`. Verified after
  the fix: `mistral-large-3:675b` 402 → `qwen3.5:397b` 402 → **`gpt-oss:120b`
  succeeded in 5.0s**. Only ~6 of ~19 cloud models are on the free plan.

### Provider ordering UI

- New `user_settings` table (migration `0006_high_robbie_robertson.sql`, additive:
  one CREATE TABLE + one unique index) — a per-user key/value store, applied to
  the remote Turso database.
- `resolveExtractionOrder` reconciles a saved order against the code's list:
  unknown ids dropped, new providers appended. A stale preference can never stop
  extraction. `getExtractionOrder` additionally narrows to providers the user can
  ACTUALLY use — registered in the chat registry AND (keyless OR has a key).
  **Gemini has a key but is hidden, correctly: it has no chat-registry entry.**
- Settings card uses dnd-kit; the WHOLE ROW is draggable. **Move up / Move down
  buttons are not decoration — WCAG 2.2 AA requires a single-pointer alternative
  to any drag.** Page server-prefetches so the list renders at its real length
  (a skeleton would have to guess a row count and shift).
- Dark hover is `-900`, not `-950`: against a near-black card `-950` is invisible,
  so dark mode had no equivalent of light mode's `-50` highlight.

### Agent sprawl — FIXED AND MEASURED (2026-09-02)

**The router fix alone solved it. No taxonomy constraint or synthesis cap was
needed** — that was considered and deliberately NOT built, because the measured
baseline made it unnecessary complexity.

The blocker was that `agent_router` was `edited=true`, and `seedPrompts` skips
edited rows — so an edited prompt is frozen forever and misses every later
improvement. New `resetPrompt()` restores the seed content AND clears `edited`,
putting the row back under that refresh. Reset to v3, then measured:

| Run | Video | Result |
| --- | --- | --- |
| 1 | wildlife facts (the clip that CREATED "Animal Facts") | `mode: system` → Animal Facts |
| 2 | dog behaviour (different subject entirely) | `mode: system` → Animal Facts |

Agent count held at 3 across both. Run 2 is the real test: it generalised to a
different animal subject rather than only recognising the clip it was born from.
Before the fix the same pair would have produced two more agents.

Order of operations mattered — measuring first is what showed the extra
machinery was unnecessary. Agent library went 7 → 3 after the human deleted the
narrow ones (delete now works; see below).

### Agent sprawl — the ROUTER was the cause, not the synthesizer

Human reported near-duplicate agents ("Kitten Introduction", "Animal Drinking",
"AI Tool Overview"). The synthesizer already said "name must generalise". The
actual cause was the **router prompt**: *"Choose 0 unless … 0 is the better
answer whenever you are unsure."* Every unsure → 0 → synthesize a new agent.
Sensible with 2 System agents, corrosive once the library grows. Router now
matches on CATEGORY not subject and declines only when no category fits or the
fields would come back empty; synthesizer must pick the broadest reusable name.
**Existing over-specific agents are NOT merged retroactively** — manual cleanup.

### Per-phase models on the run page

`Routing` now carries `provider`/`model` (absent for an explicitly requested
agent, rendered as "no model needed" rather than hidden). New
`src/components/queue/run-models.tsx`. Verified on a real run: Transcription
groq/whisper-large-v3 · Agent routing ollama-cloud/gpt-oss:120b · Extraction
ollama-cloud/gpt-oss:120b.

### The stale-worker trap bit THREE times

`pkill -f "scripts/worker.ts"` **does not kill bun on Windows** — it cannot read
Windows command lines, so the old worker kept claiming jobs and running old code.
Two "failed" verifications were actually stale workers. Use:
`Get-CimInstance Win32_Process -Filter "Name='bun.exe'" | Where-Object { $_.CommandLine -match 'worker' } | Stop-Process -Force`

## Session Auth Phase 0 — YouTube's GVS 403 (2026-09-01) — AWAITING APPROVAL

Design doc: **`SESSION_AUTH.md`** (new, repo root). Human approved the doc and said
"start building" on 2026-09-01. Phase 0 is the first of seven phases and is the
only one that ships alone, gated on nothing.

**The bug this fixes was found while investigating PO tokens, and it is not the
bug we thought we had.** `LLM_STATE.md:103` recorded YouTube's "Sign in to confirm
you're not a bot". That bot check has **decayed** — it no longer reproduces. What
reproduces instead is `HTTP Error 403: Forbidden` on the **media** fetch, after
metadata resolves fine.

Measured on yt-dlp 2026.03.17, anonymous, `-f bestaudio/best`:

| Video | default | `web_embedded` | `mweb` | `tv_simply` |
| --- | --- | --- | --- | --- |
| `dQw4w9WgXcQ` (music) | ❌ 403 (×2) | ✅ | ✅ | ✅ |
| `9bZkp7q19f0` (music) | ❌ 403 | ✅ | – | – |
| `n5t23nvU_t0` (**Short**) | ❌ 403 | ✅ | ✅ | ✅ |
| `T-1iAFMZunY` / `MGIovezvFSQ` / `afZpm4LVjG0` (Shorts) | ✅ | ✅ | – | – |

- **The default client chain fails 3 of 6 — including an ordinary Short**, not
  just music. `download.ts` passed no `--extractor-args`, so this was live.
- **It was also misclassified.** "HTTP Error 403: Forbidden" matches none of the
  `UNAVAILABLE` patterns, so it fell through to `DOWNLOAD_FAILED`, which is not
  permanent — BullMQ retried a deterministic failure through the whole attempt
  budget. Now: fallbacks first, and a 403 that survives *every* client is
  `SOURCE_UNAVAILABLE`, i.e. permanent.
- **Cookies would NOT have fixed this**, and neither would PO tokens. The
  provider's own README says PO tokens "do not guarantee bypassing 403 errors or
  bot checks"; it also needs Node.js ≥20 or Deno, which RULES.md:14 forbids.
  Rejected — documented as an escalation in `SESSION_AUTH.md:1.1b`.
- **`tv`, `android_vr` and `ios` do NOT work** ("page needs to be reloaded",
  403-on-media, and "requested format is not available" respectively). This is
  not "any non-default client", which is why the list is env-tunable.
- **yt-dlp warns its own version is >90 days old** — the `Dockerfile:78` pin is
  ~5.5 months stale. Risk #8 in the doc; needs a bump cadence, not a floating tag.

**Changed:** `src/config/index.ts` (`media.ytDlpFallbacks`, keyed by source id so
no source string is hardcoded in flow logic), `src/lib/media/download.ts`
(`runYtDlp` extracted; 403-only fallback loop; three-way classification),
`.env.example` (`YT_DLP_YOUTUBE_CLIENTS`).

**Verified:** typecheck 0 errors, biome clean on changed files, `bun run build`
succeeds, `download.ts` 204 lines (under the 250 cap). Exercised through the
**real `download()` code path**, not just the CLI: `n5t23nvU_t0` (previously 403)
now returns a 1.2 MB webm with an intact title, logging exactly one fallback warn
on `web_embedded`; `T-1iAFMZunY` succeeds on the default client with **zero**
fallback attempts. **Worker NOT yet restarted and no queued end-to-end run has
been exercised** — do that before trusting any pipeline behaviour (see the stale
worker trap below).

## Instagram Unblocked via instaloader (2026-09-01, human decision)

**Instagram works now. The first fully end-to-end run in the project's history — ingest → transcribe → route → extract → verify → publish — was an Instagram Reel.**

- **yt-dlp cannot fetch Reels anonymously; instaloader can.** Reproduced on the exact Reel a run had already failed on (`DauNJ7Hpwaa`): yt-dlp returns "rate-limit reached or login required", instaloader returns a 24.8 MB mp4 plus rich metadata, no login.
- **A zero-dependency path was tried first and does NOT exist.** Five anonymous routes tested from Bun `fetch`: GraphQL `doc_id` (403), the same with a csrftoken cookie bootstrap (**401 `require_login`**), `?__a=1&__d=dis` (404), `i.instagram.com/api/v1/media` (404), and `/embed/captioned/` (200 but a 620 KB JS shell with no media data). instaloader does more than a couple of requests; reimplementing it was not on the table.
- **Cost: Python in the image.** `oven/bun:1` was deliberately Python-free (ffmpeg from apt, yt-dlp as a self-contained binary). instaloader is pure Python with no standalone build, so the Dockerfile now installs `python3 python3-pip` and pins `instaloader==4.15.3`.
- **Preflight is now source-scoped.** `ensureMediaBinaries(sourceId)` skips binaries whose `sources` list excludes this run — a YouTube-only operator without instaloader must not be blocked by it.
- **Downloader dispatches on `parsed.source`** in `download.ts`; `instaloader.ts` maps Instagram's post JSON onto the same `source_info` shape `pruneInfo` produces for yt-dlp, so routing and the UI need no per-source branches. Instagram has no title field, so the caption's FIRST LINE becomes the title — that is what routing reads.
- **The cookie-capture work stays deferred as the fallback** (human decision). Anonymous access is rate-limited and will break; the login-shaped instaloader failures map onto the same `SOURCE_UNAVAILABLE` code yt-dlp's do, so it degrades rather than dies.
- **Photo-only posts** exit 0 and write a .jpg — treated as `SOURCE_UNAVAILABLE` ("no video track"), not a tool failure.

### Two real bugs this exposed

1. **An empty model response killed the run instead of falling through.** `chatCompletion` throws `LlmError(200, "Model returned an empty response")`, and `disposition()` had no case for a 2xx, so it fell to `"fail"` and rethrew — no next model, no next provider. A free OpenRouter model returned an empty 200 on this 90-second transcript and the run died twice (BullMQ retried, same result). Any `LlmError` with `status < 400` is now `"next-model"`: HTTP succeeded, so an unusable completion is a MODEL problem.
2. **The worker was running stale code**, exactly as RULES.md warns. The first Instagram run after the change failed with yt-dlp's error message because the worker still held the pre-instaloader `download.ts`. RESTART THE WORKER after any pipeline change — the symptom is a correct-looking failure with the *old* wording.

### Measured on the successful run (`4d0435ec`)

```
download 15.3s · audio_extract 0.18s · transcribe 1.3s · route 3.6s
extract 303.5s · verify 1ms · publish 2.4s · total 328.7s
```

- **Extraction took FIVE MINUTES** on `nvidia/nemotron-3-super-120b-a12b:free` via OpenRouter — one attempt, no retries, no skipped models, just slow. PRD §6 targets sub-30s for the whole pipeline. Groq does the same work in ~5s. **OpenRouter is still first in `EXTRACTION_ORDER`; moving Groq first is a one-line change and is now strongly indicated.**
- **Verification earned its keep on real data: 35 claims extracted, 28 verified, 7 flagged — all `TIMESTAMP_MISMATCH`.** The quotes were verbatim, but on a 20-segment transcript the model reused timestamps across ingredients, so the citations pointed at the wrong moments. Genuine catches, not false positives.
- Published 42 Notion blocks in 2.4s.

## Tasks 4.5 & 4.6 Completion Notes (2026-09-01)

### 4.5 Evidence verification

- **Two checks per claim**, in `src/lib/extraction/verify.ts`: the quote must appear in the English transcript after normalisation, AND the cited ms range must overlap the segments the quote was actually found in. The second check is only possible because `normalise.ts` keeps an offset table mapping the normalised transcript back to its segments.
- **The bar for `verified` is an EXACT normalised substring — there is no fuzzy threshold.** A similarity cutoff would let a paraphrase through, which is the one thing this feature exists to prevent. `tokenOverlap` is computed on failures ONLY, to label the reason: `QUOTE_ALTERED` (≥0.6 of the words present, so the model reworded a real quote) vs `QUOTE_NOT_FOUND` (invented).
- **Normalisation is lossy in FORM only, never in words**: NFKD, strip combining marks, lowercase, unify dash/quote variants, drop punctuation, collapse whitespace. Two different sentences cannot normalise to the same string, so a match is still evidence of a verbatim quote.
- **Bug found by the negative test:** dashes were normalised to `-` and KEPT, while commas were removed — so an em-dash quote ("water — add ginger") failed against the transcript's comma ("water, add ginger"). A dash is only content INSIDE a word ("2-3", "half-inch"); between spaces it is punctuation. Without the negative test this would have shipped as silent false flagging.
- **Flagged, not dropped** (human decision): the value stays in `result.extraction`, the finding is recorded in `additional_data.verification`, and both the run detail page and the published page mark it.
- **Verified against real output AND against deliberately corrupted evidence.** 8 negative cases: verbatim OK, formatting-only OK, paraphrase flagged, fabrication flagged, wrong timestamp flagged, empty flagged, visual tier flagged, nested-in-array reached. Real runs: 15/15 and 11/11 verified.

### 4.6 Document tree & Notion publish

- **`src/lib/render/document.ts` builds a TREE, never a Markdown string.** A string would force every future destination to re-parse structure it already had; the tree is what makes "a second Ray needs no rewrite" true. `notion-blocks.ts` is the only Notion-aware file, and a second Ray adds a sibling to it.
- **Evidence maps to a Notion `toggle` containing a `quote` block**, with the timestamp in the toggle's own summary so the range is readable while folded. Flagged claims get a `⚠️` prefix plus a yellow callout inside the toggle. NO Markdown is ever emitted, and nothing goes into a code block.
- **The parent page is DISCOVERED, not configured.** A Notion integration only sees what was shared with it, so `findParentPage` searches for a container page (parent `workspace` or `page_id`) in preference to a database row — writing into a user's database would have to satisfy that database's schema.
- **Verified end to end against the live Notion API.** Published run `ca63b6fd` → 15 document nodes → 16 top-level blocks (1 callout, 4 heading_2, 2 paragraph, 6 bulleted_list_item, 3 numbered_list_item; evidence toggles are children). Read back from the API to confirm the nesting: `bulleted_list_item > paragraph(quantity) + toggle > quote`. Steps became `numbered_list_item` because the ORDERED_FIELD heuristic matches the field name.
- `publish_ms` added to the `publishing` stage's timingKeys, so the last stage lights up automatically — the run detail page now shows all five stages complete.

### OpenRouter, now that a key exists

- **Works.** 425 models fetched, 11 eligible free ones (json + structured). Extraction ran on `nvidia/nemotron-3-super-120b-a12b:free` and `dots-studio/dots-3-note-preview:free`.
- **Ranking bug fixed, same class as the Groq one.** `liquid/lfm-2.5-2.6b:free` ranked 2nd for synthesis because an unparseable size scored 0 and 2.6 > 0 — a model that ADVERTISES being tiny outranked one that simply does not state a size (`z-ai/glm-5.2`). Unknown size is now scored as mid-sized (`ASSUMED_PARAMETERS = 30`), so declared-large > unknown > declared-small. Context is also capped at `SUFFICIENT_CONTEXT` before ranking: past ~64k it buys nothing for a transcript, and ranking on it put a 512k niche model above a frontier one.
- **`nvidia/nemotron-3-super-120b-a12b:free` intermittently 404s** ("Provider returned error") despite being in the catalog. The model fallthrough handles it — this is exactly what it is for — but it costs a wasted round-trip.
- **OpenRouter is 6–15x SLOWER than Groq.** Measured extraction wall time: 74s, 35s, 88s on OpenRouter vs ~5s on Groq. PRD §6 targets sub-30s for the WHOLE pipeline. OpenRouter is currently FIRST in `EXTRACTION_ORDER`; moving Groq first is a one-line change in `src/lib/extraction/providers.ts` and is worth considering.
- **Router quality varies by model:** on one run nemotron declined the Recipe agent for a chai recipe and synthesized a "Tea Recipe" agent instead. gpt-oss-120b routed the same transcript correctly every time.

### UI/UX changes made alongside

- **Explicit clone replaces copy-on-write** (human decision): a System agent is never edited or forked silently. One row button opens the dialog — tooltip "View / Clone" or "Edit / Clone" by type — System opens read-only with Close + Clone, Human opens editable with Close + Clone + Save. Clone switches mode IN PLACE and pre-fills a non-colliding name ("Recipe (copy)").
- **Row actions are uniform**: every row renders the same slots, with Delete disabled-and-explained on System rows. Hiding it left ragged rows where a gap read as a rendering failure.
- **New `Modal` shell** (`src/components/modal.tsx`): three-row grid, static header/footer, ScrollArea body. Built over `DialogContent` — an earlier hand-rolled portal + div looked identical but Base UI wires Escape, backdrop dismissal, focus trapping and `DialogClose` to its own Popup, so the close button and auto-close-on-save silently did nothing.
- **`json-edit-react` for every JSON surface** (`json-view.tsx` / `json-panel.tsx` / `json-theme.ts`). Themed from the app's own CSS variables so it follows `.dark` with no JS. The panel owns a CAPPED ScrollArea: the cap must go on the ScrollArea's VIEWPORT, not the root — Base UI sizes the viewport `h-full` and that percentage does not resolve against a flex-derived height, which left the root correctly capped at 382px while the viewport stayed 11349px and the tree was clipped with no scrollbar at all.
- **All `hover:scale-*` replaced with `hover:-translate-y-px`** and both `backdrop-blur` usages removed. Scaling promotes an element to a composited layer and re-rasterises its text, which is the "blur on hover" that was reported. Verified 0 blurred elements and 0 `hover:scale` remaining.
- **Toast viewport moved to `z-100`.** It was `z-50`, identical to the dialog, so the later-mounted modal painted over it.
- Fixed a real Base UI accessibility error on the run detail page: the back button renders an anchor via `render={<Link>}` and needs `nativeButton={false}`.

## Task 4.4 Completion Notes (2026-09-01)

**Human decisions taken during this task (all reversed/refined mid-build, in this order):**
1. JSON-Schema validation → add `@cfworker/json-schema` (Zod cannot consume arbitrary JSON Schema, and the Agents UI accepts any pasted schema).
2. Synthesized schemas → **persist as System agents**, reusable by later runs.
3. Unverifiable fields → **publish flagged**, not dropped (Task 4.5 implements the flagging).
4. Model selection → started as a pinned id list, then **superseded**: model ids are NEVER hardcoded. Discovered from each provider's `/models`, ranked by advertised capability, cached in the DB.
5. **Every prompt lives in the database**, with Redis as the hot cache, invalidated on write.
6. System agents are **copy-on-write**: editing one forks a personal Human copy; the fork then supersedes the original in routing. **A user's own agents outrank System agents.**
7. JSON is rendered through `json-edit-react` **everywhere**, not `<pre>` dumps.

- **New tables** (`drizzle/0004_military_eternals.sql`, `0005_lame_sunfire.sql`, both additive `CREATE TABLE` only, applied to remote Turso): `model_catalog` (per-user provider catalog cache) and `prompts` (per-user editable pipeline prompts). Split into `src/lib/db/schema-pipeline.ts` and re-exported from `schema.ts`, which had crossed the 250-line cap; drizzle-kit still reports one 9-table schema. The `schema ⇄ schema-pipeline` cycle is safe because the FK reference is a lazy arrow — verified at runtime, not just by tsc.
- **`extract_ms` COLLIDED.** Ingest already wrote `extract_ms` (ffmpeg audio extraction) and `run-status.ts` assigned it to `downloading`. Since stage completion is derived from recorded timings, adding it to `extracting` too would have made ffmpeg's work show the agent stage as complete — the same false-green-tick bug fixed once in 4.2. Ingest's key is now `audio_extract_ms`; `extracting` owns `route_ms` + `extract_ms`.
- **Model ranking is capability-driven, with exactly two documented heuristics.** Groq publishes `supported_features` (`json_mode`, `structured_outputs`), `input/output_modalities`, `context_length`; OpenRouter publishes `supported_parameters` + `pricing`; **OpenAI publishes nothing beyond id/created/owned_by.** The heuristics are (a) an id regex excluding guard/embed/tts/moderation models, because `openai/gpt-oss-safeguard-20b` advertises *identical* capabilities to the general chat model, and (b) a parameter count parsed from the id. (b) exists because a `created`-desc tiebreak picked `gpt-oss-20b` over `gpt-oss-120b` (identical on every published figure, 20b is newer) and **20b failed schema validation twice, 13 then 11 errors, on a recipe that 120b extracts first-try**.
- **Groq's free tier is 8000 TPM and the transcript goes over the wire twice per run** (routing, then extraction). Back-to-back runs 429 routinely. Two mitigations: routing sees a 4000-char truncation (it only needs the clip's *kind*), and `runChat` waits out the provider's own advised delay once when every candidate is exhausted. NOTE: under sustained pressure the router still degrades to weaker models that fail schema validation — measured, a run fell through to `groq/compound-mini` and produced 3 fields instead of 4. **Worth considering: fall through to the next model when a model fails validation twice**, which the brief's "exactly one retry" wording did not cover.
- **Redis cache uses its OWN ioredis connection**, not the queue's. BullMQ's is `enableOfflineQueue: false` so a pre-handshake command throws (`Stream isn't writeable...`, measured on the first read in a fresh process). For a cache that trade is backwards; a briefly-buffered cache write is harmless. Namespaced `relay:cache:*`, separate from BullMQ's `{relay}`.
- **The evidence contract is structural, not requested.** Agent schemas embed a `oneOf` of a `transcript` and a `visual` evidence shape, discriminated by `kind` — so Task 4.3b adds a producer and a verifier branch, not a migration across stored agents. The synthesizer never writes JSON Schema itself: it proposes a field *plan* and `compile()` injects evidence on every field, because a model asked for JSON Schema will eventually emit one where evidence is optional, and that schema would then be persisted and reused.
- **New `Modal` shell** (`src/components/modal.tsx`): three-row grid (static header / scrolling ScrollArea body / static footer), sizes sm→full. Built because the agent editor's JSON Schema pushed its own Save button off-screen.
- **Verified in the running app** (agent-browser, dark + light, 1440×900 + 390×844): routing to the seeded Recipe agent (`route 17ms · extract 5.34s`, timeline stage lights up automatically); synthesizer inventing a "Bike Maintenance" agent for a non-recipe transcript and extracting against it first-try; copy-on-write producing `Recipe (my version)` as a Human row with the System original untouched; routing candidates confirming the fork ranks #1 **and removes the System Recipe from the list**; the Prompts dashboard saving, bumping to v2 and invalidating Redis; extraction rendering as content with expandable evidence quotes. Typecheck 0, biome clean on all 66 changed files, build succeeds, every authored file under 250 lines.
- **NOT verified:** a full end-to-end pipeline run through the worker. YouTube still rate-limits this machine, so extraction was exercised against the transcripts already stored on runs `ca63b6fd` and `f9651c15` (both now carry real `result.extraction`). `bun run lint` still fails repo-wide on pre-existing `useSortedClasses` violations in `landing-page.tsx`/`privacy`/`terms` — untouched by this task.
- **OpenRouter has NO key configured yet**, so every extraction ran on Groq. The OpenRouter provider entry, catalog normaliser and ranker are written and typecheck, but are **unexercised against a live OpenRouter key** — add one at /vault to activate that path.
- QA accounts (`qa-relay44@`, `qa-json@`) and the synthetic "Bike Maintenance" agent were removed afterwards.

## Queue UI + Deploy Notes (2026-09-01)

- **Run detail page** `/queue/[id]`: stage timeline, both transcript streams with ms-stamped segments, discarded-output panel for no-speech runs, source/processing facts, and the full `additional_data` blob. Prefetched server-side into `runKeys.detail(id)`, polls while the run is live and stops when terminal.
- **Stage completion is derived from EVIDENCE (recorded timings), not list position.** The first version showed green ticks on `extracting`/`publishing` for a finished run — stages that do not exist yet. They now render as "Not run".
- **Status badge**: the spinner slot is only rendered while active; an always-present slot made terminal labels sit right-of-centre inside their own pill. Column width is reserved on the table cell instead.
- **Links** resolve their icon in three tiers (`src/components/queue/link-icon.tsx`): media-source brand mark → bundled brand mark (12 platforms) → `config.links.faviconUrl` → generic glyph. Only the third tier touches the network, and it is the *browser* calling out, so `FAVICON_SERVICE_URL=""` disables it.
- **Dragonfly runs with `--cluster_mode=emulated --lock_on_hashtags`** and BullMQ uses the hash-tagged prefix `{relay}`. CORRECTION to an earlier note: this pairing is a **throughput** choice, not correctness — measured locally, an un-tagged prefix still works fine under emulated cluster mode on a single node. The tag pins a queue's keys to one Dragonfly thread.
- **Coolify (app `<app-resource-uuid>`, env `relay`)**: added `REDIS_URL=redis://dragonfly:6379`, `QUEUE_CONCURRENCY/ATTEMPTS/BACKOFF_MS`, `FAVICON_SERVICE_URL`. `STUDIO_PASSWORD` was already set, so dropping the `DRIZZLE_MASTERPASS` fallback from compose is safe (that var held the literal error string — a Coolify artifact).
- **The worker service builds from the Dockerfile rather than reusing a shared image tag.** Coolify rewrites every compose service's image to `<resource-uuid>_<service>:<sha>`, so a hand-pinned `relay-app:latest` shared between `relay` and `worker` would not exist at deploy time. CORRECTION (2026-09-01): the claim that "Docker's layer cache makes the second build nearly free" was **wrong**. Only `relay` was passing the `NEXT_PUBLIC_*` build args; those are baked into `ENV`, so the worker's build produced a different cache key from the ENV layer down and recompiled the entire Next.js app a second time. The worker service now passes the identical args — see the deployment notes below.
- **YouTube now rate-limits this dev machine** ("Sign in to confirm you're not a bot") after repeated pulls of the same clips. Not a code fault — it maps correctly to `SOURCE_UNAVAILABLE` — but it means the deferred cookie work applies to YouTube as well as Instagram.

## Task 4.3 Completion Notes (2026-09-01)

- **Provider registry** `src/lib/transcription/providers.ts` mirrors `src/server/ray-providers.ts`: the id catalog stays in `src/lib/providers.ts`, this file maps ids onto endpoints/models. Pipeline code never names a provider — `resolveProvider()` picks the first configured one in preference order (Groq first: far faster than OpenAI's whisper-1, and free).
- **Two streams (PRD §4.2)**: `/audio/transcriptions` (spoken language) and `/audio/translations` (English) run **concurrently**, both `verbose_json`, float seconds converted to integer ms. Roman/phonetic output comes from a chat transliteration pass in `roman.ts` — phonetic, never translating.
- **Whisper models**: `whisper-large-v3`, NOT `-turbo` — turbo is transcription-only and does not serve `/audio/translations`.
- **Groq's catalog churns.** `llama-3.3-70b-versatile` was configured and had already been withdrawn ("model does not exist"); there are now **no llama models on Groq at all**, and **no vision-capable models**. Current chat model: `openai/gpt-oss-120b`. Verify against `GET /openai/v1/models` before changing.
- **Free tier confirmed adequate**: Groq Whisper 20 RPM / 2,000 RPD / 28,800 audio-sec per day; chat 30 RPM / 14,400 RPD. One run ≈ 120 audio-seconds (two Whisper calls on the same clip) ⇒ ~240 clips/day free. OpenRouter cannot serve this stage at all — it has no audio transcription endpoint.
- **Gotchas found by testing against real clips:**
  1. **A Whisper decoding `prompt` was tried to force Latin script and removed.** It does not work (Hindi still returned Devanagari) and it *contaminates* output — a low-speech clip returned "The Latin ürlich", straight out of the prompt text.
  2. **Whisper fabricates speech on music-only audio** ("Thank you for watching!", "Sampai jumpa di channel ini!"). Since silent Reels are common, this would have fed invented content to the extraction agent — the exact failure this product exists to prevent. Gated on `no_speech_prob`; fabricated text is discarded but retained under `additional_data.no_speech.discarded_text` for auditing.
  3. **`avg_logprob` is NOT a usable speech signal** and briefly broke the gate: measured over whole clips it is *anti-correlated* — narrated Hindi averaged **-1.278** while music-only averaged **-0.708**, so the rule rejected real speech. Thresholds derived from a partial 6-segment sample were wrong; only `no_speech_prob` (0.107 vs 0.701) is gated on.
  4. Transliteration is done **line by line with a segment-count check**; a mismatched count returns the original rather than misaligning the timestamps Task 4.5 verifies against.
- **`hasSpeech: false` is a signal, not a throw** — transcription returns empty streams so the caller can fall back to the frame/vision layer (below). The pipeline throws `NoSpeechError` only because no fallback exists yet.
- **Verified end to end** against real clips under `abdulwadudh5@gmail.com`: narrated Hindi Short → `done` in 7.5s with correct Roman ("aaj main aap sabke saath chaay ki recipe share karne wali") and English ("Today I will share a very easy and tasty tea recipe. Take 2 cups of water, add 1 inch ginger…"), both ms-aligned; music-only Short → `failed` with `NO_SPEECH`, nothing fabricated. Typecheck 0, biome clean, build succeeds, all files under 250 lines.

## Planned: Task 4.3b — Frame/Vision Extraction (human decision 2026-09-01, AMENDS PRD §5)

**PRD §5 lists "Visual frame-by-frame OCR / computer vision analysis" as Strict Out of Scope. That is now amended.** Evidence: most Reels/Shorts are music over on-screen text, with *no speech and empty descriptions* (verified: two silent Shorts had descriptions of "" and a bare URL). For those clips audio and metadata both yield nothing, so frames are the only content source.

- **Approach**: ffmpeg samples keyframes (scene-change detection), a multimodal model reads on-screen text and what is visually happening.
- **Groq cannot do this** — its catalog has no vision models. **Gemini's free tier is the intended provider** (it also exposes an OpenAI-compatible endpoint, so it fits the existing registry shape); `gemini` is already in `AI_KEY_PROVIDERS`. Requires the user to add a Gemini key.
- **Evidence model gains two tiers, labelled (human decision):** transcript-derived fields keep the strong guarantee — a verbatim quote must appear in the transcript or the field is dropped. Frame-derived fields carry `{frame_timestamp, on_screen_text}` and are **explicitly marked as visual evidence** in the published output, because a model reading a frame is a weaker claim than a verbatim quote and must not be presented as equivalent.
- Narrated clips keep transcript grounding; only silent clips fall back to visual citations.

## Deferred: Social Cookie Credentials (human decision 2026-08-31)

Instagram refuses anonymous downloads, so Reels need a signed-in session passed to yt-dlp via `--cookies`. Decided approach and sequencing:

- **Build AFTER Task 4.6**, not now — the pipeline is the product; cookie capture only unlocks one extra source, and once 4.3–4.6 exist a captured cookie can be verified end-to-end instead of only proving the download step.
- **Capture method: server-side browser the user drives**, not a paste box and not a child window. Chromium runs on the server (**headful + Xvfb** — chosen over `--headless=new` because Instagram fingerprints headless aggressively); frames stream to a `<canvas>` via CDP `Page.startScreencast`, user input is relayed back through `Input.dispatchMouseEvent`/`dispatchKeyEvent`. The user types their password into Instagram's own page, so **Relay never stores a social password** and 2FA/CAPTCHA just work. Cookies are read from the browser's own jar (`Storage.getCookies`), serialized to Netscape format, and stored as a new credential `type: "cookie"`.
- **Why not an in-app child window** (asked and answered): `window.open` is cross-origin so the DOM is unreadable, `document.cookie` is origin-scoped, and Instagram's `sessionid` is `HttpOnly` so JavaScript cannot read it even same-origin. Every workable route goes through a privileged context — a browser extension (`chrome.cookies`) or a browser we own. There is no in-page route.
- **Bonus property**: a cookie minted from the server's IP is later used by yt-dlp from that same IP, avoiding the IP/device mismatch that gets pasted home-browser cookies flagged.
- **Known risks**: Instagram anti-automation on datacenter IPs (the main failure mode), ~400 MB image growth plus ~300–500 MB RAM per session, and the screencast WebSocket is a remote-control channel that must be authenticated, user-scoped, single-use and expiring. Note the password *transits* the server even though it is never stored.
- `credentials.type` is plain TEXT with no CHECK constraint, so adding `"cookie"` needs **no migration** — only the Drizzle enum and Zod schema.

## Task 4.2 Completion Notes (2026-08-31)

- **Schema**: new `relay_runs` (id, user_id FK cascade, source_url, source, agent_id, status enum, error, timings JSON, result JSON, `additional_data` JSON, timestamps; index on `(user_id, status)`), plus `additional_data` added to `credentials` and `agents` per human decision. Migration `drizzle/0003_perfect_redwing.sql` is additive-only (two `ADD COLUMN ... NOT NULL DEFAULT '{}'`), generated and applied against the remote Turso database.
- **Queue**: BullMQ 6.3.3 + ioredis 6 over Dragonfly. BullMQ v6 moved the Redis client to a **peer dependency**, so `ioredis` is a direct dependency now, not transitive.
- **`--default_lua_flags=allow-undeclared-keys` is MANDATORY on Dragonfly.** BullMQ's Lua scripts build key names at runtime (`args[1] .. jobId`); Dragonfly rejects that by default and *every* job fails on first enqueue with `script tried accessing undeclared key`. Set in docker-compose and documented in `src/config` and `.env.example`.
- **Architecture**: `POST /api/v1/relay/process` writes a `queued` row then enqueues, returning 202 — the request never waits on the pipeline. The row is created *before* the job so a job can never reference a missing row; if the enqueue itself fails the run is immediately marked `failed` with `ENQUEUE_FAILED` rather than sitting on `queued` forever. `relay_runs` is the source of truth, so a flushed Dragonfly loses scheduling, never history.
- **Worker** runs as its own process (`bun run worker`, `scripts/worker.ts`, `worker` service in compose reusing the `relay-app:latest` image). Permanent failures (`SOURCE_UNSUPPORTED`, `SOURCE_UNAVAILABLE`, missing binary) throw `UnrecoverableError` so BullMQ stops instead of burning the retry budget re-downloading nothing — verified: an unavailable video failed after 1 attempt, not 2.
- **`src/lib/run-status.ts`** holds the status vocabulary (labels, solid badge fills, terminal check) with only a *type* import from the schema, so client components can use it without pulling Drizzle into the browser bundle (`src/lib/runs.ts` opens the db and must never be imported client-side). `Record<RunStatus, …>` makes it exhaustive by type, so a new status can't silently drift.
- **UI**: `/queue` follows the established list pattern (server prefetch into `runKeys`, HydrationBoundary, skeleton mirroring the real chrome, loading/error/empty/refetch/stale states). Polling is a `refetchInterval` function that returns 2000 while any run is non-terminal and `false` otherwise — measured at **3 polls during an 8s active window, 0 polls in 12s idle**. Sidebar "Queue" un-flagged.
- **Gotchas found and fixed:**
  1. `TableCell` bakes in `whitespace-nowrap`, so the error message's `line-clamp-2` could never wrap — it clipped mid-word. Needs an explicit `whitespace-normal`.
  2. `pkill -f "start-server.js"` does **not** match this project's `bun --bun next start` process. Stale servers kept serving an old build while the "new" one silently failed to bind — which looked exactly like a broken route (`/queue` fell through to `[...catchAll]`, whose Title Case fallback even produced a convincing "Queue" heading). Kill by matching `next start` via PowerShell and confirm port 3000 is free before rebuilding.
- **Verification**: typecheck 0 errors; `biome check` clean on all changed paths; `bun run build` succeeds. Full round-trip in the running app with agent-browser (dark + light, 1440×900 + 390×844): empty state → invalid-URL inline rejection → submit → `Queued` badge + toast → polled to `Done` with title and 3.5s duration → unavailable URL → red `Failed` badge with wrapped message → delete with confirm → row gone and persisted. QA account and its runs were removed afterwards.
- **NOTE — `bun run lint` fails repo-wide** on pre-existing `useSortedClasses` violations in files this task never touched (`src/app/login/page.tsx`, `src/app/privacy/page.tsx`, landing page). Not introduced here; worth a separate formatting pass.
- **Local dev** needs Dragonfly: `docker run -d --name relay-dragonfly --ulimit memlock=-1 -p 6379:6379 docker.dragonflydb.io/dragonflydb/dragonfly:latest --default_lua_flags=allow-undeclared-keys`, then `bun run worker` alongside `bun run start`.

## Task 4 Human Decisions (2026-08-31)

- **Queue/workers:** BullMQ + Dragonfly (Redis) — runs are enqueued, never executed inside the HTTP request. Lands in Task 4.2.
- **`additional_data` JSON column** on all app-domain tables (`credentials`, `agents`, `relay_runs`) — NOT on Better Auth's `auth_*` tables, which Better Auth owns and would never populate.
- **Production is containerised** — anything the pipeline needs at runtime must be installed in the image, not assumed on the host.

## Task 4.1 Completion Notes (2026-08-31)

- **Source registry** `src/lib/media/sources.ts`: owns the supported-source vocabulary the way `providers.ts` owns credential providers. `parseSourceUrl()` accepts only Instagram Reel (`/reel/`, `/reels/`, `/<account>/reel/`) and YouTube Shorts (`/shorts/`) paths on those hosts, normalises `www.`/`m.`, rejects non-http(s), and returns a tracking-free `canonicalUrl` that is what gets handed to yt-dlp and stored on the run. `SUPPORTED_SOURCE_LABELS` derives all user-facing copy, so no pipeline code contains a source string literal.
- **Zod boundary**: `relayProcessSchema` in `src/lib/schemas.ts` refines the URL through `parseSourceUrl`, so adding a source never touches the schema.
- **Binary preflight** `src/lib/media/binaries.ts`: every run checks `yt-dlp`/`ffmpeg` before spawning and throws `MediaBinaryError` naming the install command and the override env var. Only *successful* detections are cached, so installing a binary on a running server takes effect without a restart.
- **Ingest** `src/lib/media/{ingest,download,errors}.ts`: `withIngestedAudio(input, consume)` is a scope function — it downloads into `data/tmp/run-<id>/`, hands the MP3 to the caller, and purges the directory in `finally`, so download failures, extraction failures and consumer failures all clean up. yt-dlp's ~500 KB info JSON is pruned to ~2.5 KB of analysable source metadata (title, description, channel, counts, tags, upload date) destined for `relay_runs.additional_data`; format tables, captions and expiring signed CDN URLs are dropped.
- **Config**: new `config.media` section (`YT_DLP_PATH`, `FFMPEG_PATH`, `MEDIA_TEMP_DIR`, and the mono 16 kHz 64 kbps MP3 target Whisper wants).
- **Dockerfile**: installs `ffmpeg` (Debian) and a pinned, arch-aware, self-contained `yt-dlp` build. Without this the containerised prod deploy would fail every run at preflight.
- **Gotchas found and fixed (all three were silent failures):**
  1. `ffmpeg` exits 8 on `--version` (it only accepts single-dash `-version`) after printing its banner, so a perfectly good ffmpeg read as "broken". The version flag is now per-binary.
  2. A newline inside a Bun `$` template is a **command separator**, not whitespace — multi-line commands silently ran the second line as its own command. All invocations are single-line with arguments passed as an array (each element becomes exactly one argv entry).
  3. Bun's `rm` shell builtin **silently no-ops on Windows when the path starts with `./`** — exit 0, empty stderr, directory untouched. Every run was leaking its media. The temp root strips the `./` prefix, and `purge()` now verifies the directory is actually gone instead of trusting the exit code.
- **Verification**: `bun run typecheck` 0 errors; `biome check` clean; `bun run build` succeeds; `import { $ } from "bun"` confirmed to build *and execute* inside a real Next.js production route handler (temporary probe route, reverted). Full ingest exercised on Windows and again inside the `oven/bun:1` container: real YouTube Short downloads/extracts/purges; unavailable, unsupported, consumer-throws and missing-binary paths all verified. **Instagram happy path is NOT verified** — yt-dlp cannot fetch Reels anonymously ("rate-limit reached or login required"), which correctly maps to `SOURCE_UNAVAILABLE`; publishing real Reels will need a cookies/session mechanism that is not in Task 4's scope.

## Task 3 Completion Notes (2026-08-31)

- **Agent service** `src/lib/agents.ts`: `listAgents`/`createAgent`/`updateAgent`/`deleteAgent`, masked to an `AgentSummary` shape (`isActive` coerced to boolean; the `is_active` column has no Drizzle boolean mode). Only `type: "human"` rows are creatable/mutable through this API — `update`/`delete` scope their WHERE clause to `type = "human"` so a future System agent (synthesized by Task 4's pipeline) can't be edited or removed from this UI.
- **API**: `GET/POST /api/v1/agents`, `PUT/DELETE /api/v1/agents/:id` (Zod-validated via `agentInputSchema`/`agentUpdateSchema` in `src/lib/schemas.ts`), mounted in `src/server/agents.ts` following the `credentialsModule` pattern.
- **UI**: `/agents` page — card grid (`agents-grid.tsx`/`agent-card.tsx`) instead of Vault's table, since agents carry richer content (prompt preview, JSON schema, active toggle) than a credential row. Shared create/edit dialog (`agent-form-dialog.tsx`) with a JSON-Schema `Textarea` (client-side `JSON.parse` validation with inline error, blocks submit on invalid JSON) and a live Active `Switch`. Added the ShadCN `Textarea` primitive (`bunx shadcn add textarea`) — didn't exist in the project yet. GSAP entrance stagger on cards per TRD's "GSAP micro-interactions" spec (`useGSAP` + `gsap.from`, scoped to the card ref) — the only page in the app using GSAP for chrome motion, everywhere else uses Tailwind `animate-in` utilities. Sidebar's "Agents" item un-flagged from `soon: true`.
- **Gotcha fixed**: `AgentCard`'s optimistic `isActive` state (`useState(agent.isActive)`) went stale after editing an agent through the form dialog — `router.refresh()` re-renders the Server Component tree with fresh props, but the already-mounted `AgentCard` client component doesn't reset its own `useState` just because a prop changed. Fixed with a `useEffect` that re-syncs local state from the `agent.isActive` prop.
- **QA (agent-browser)**: full create → toggle-active (persists across reload) → edit (including a deliberate invalid-JSON submit to confirm the inline error path) → delete round-trip verified in the running app, plus light mode and mobile viewport (390×844, single-column grid, dialog scrolls correctly).

## Task 2 Completion Notes (2026-08-29)

- **Vault service** `src/lib/vault.ts`: create/list/delete credentials + `getAccessToken`; single-tenant local user bootstrap (`users` row `local`). Refresh tokens stored self-contained as `ivHex:cipherB64` (GCM IVs must never be reused; TRD's single `iv` column serves the access token).
- **API**: `GET/POST /api/v1/credentials`, `DELETE /api/v1/credentials/:id` (Zod-validated, masked responses); `GET /api/v1/rays/oauth/notion` + `/callback` (state cookie CSRF, token exchange, encrypted persist, redirect to /vault with `?connected`/`?error`).
- **Config**: `config.notion` section (NOTION_CLIENT_ID/SECRET env vars).
- **UI**: fixed-viewport app shell (`src/components/app-shell.tsx`, root never scrolls — only ShellContent scrolls); `(dashboard)` route group; `/vault` page with credentials table, empty state, Add API Key dialog (ShadCN Field/Select/Input), delete confirmation, toasts; Connect Notion disabled with hint until Ray env is set. Built under design-taste-frontend + gpt-taste constraints; all authored files < 250 lines.
- **QA (agent-browser)**: add-key → encrypted row → delete round-trip verified in the running app; Select label bug and unconfigured-Notion UX fixed from findings.
- **Gotchas fixed**: user-added `NODE_ENV=development` in `.env.local` broke `next build` (removed — Next manages NODE_ENV); stale HMR global renamed to `__relayDrizzle`; Biome override for vendored `src/components/ui/**`.
- **Active Circuit Breakers:** See `RULES.md` (canonical) — max 3 files/step, `bun run typecheck` 0 errors, commit + STOP per task, no ghost dependencies, **Bun-first: Bun-native/Web-standard APIs only; `node:*` compat only where Bun ships no equivalent, with justifying comment; raw `bun:sqlite`, no ORM.**

## Task 1 Completion Notes (2026-08-29)

- **Scaffold:** `bunx --bun shadcn@latest init --preset b5pFrsf5Vq --template next --rtl --pointer` (mira style, zinc base, emerald theme, hugeicons, RTL, pointer). Project uses a `src/` directory layout per human instruction.
- **Toolchain (human-directed mid-task):** Biome replaces ESLint + Prettier (`bun run lint`, `bun run format`). `tsc --noEmit` retained solely for the typecheck gate (Biome does not type-check). All scripts run Next via `bun --bun` so `bun:sqlite` is available.
- **Theme:** Emerald-on-Zinc OKLCH variables in `src/app/globals.css`; dark mode default; Oxanium on `h1–h4` via `--font-heading`; Space Grotesk body; JetBrains Mono for `--font-mono`.
- **Database:** `src/lib/db/index.ts` — `bun:sqlite`, WAL, FK on; `users`, `credentials` (hybrid: AES-256-GCM `access_token`/`refresh_token` + plaintext `meta_data` JSON, indexed `expires_at` and `(user_id, provider)`), `agents` per TRD §2.
- **Crypto:** `src/lib/crypto.ts` — AES-256-GCM, unique 96-bit IV per record, auth tag appended to base64 ciphertext, key from `MASTER_ENCRYPTION_KEY` (generated into `.env.local`, gitignored).
- **Observability:** `src/lib/observability/logger.ts` (batched OpenObserve ingest + Hono middleware, console fallback when unconfigured), `src/lib/observability/client.ts` (RUM: page loads, errors, interactions), `/api/v1/telemetry` proxy keeps OpenObserve credentials server-side. Hono mounted at `src/app/api/v1/[[...route]]/route.ts` with `/api/v1/health`.
- **Dependencies added (required by Task 1 spec):** `hono`, `@types/bun` (dev), `@biomejs/biome` (dev). Removed: `eslint`, `eslint-config-next`, `prettier`, `prettier-plugin-tailwindcss`.
- **Verification:** `bun run typecheck` = 0 errors; `biome check` clean; `bun run build` succeeds; `bun scripts/smoke-test.ts` — tables/indexes created, crypto roundtrip OK, IV uniqueness OK, tamper detection OK.

## Post-Task-1 Amendments (2026-08-29, human-directed)

- **Drizzle ORM adopted** (reverses earlier no-ORM ruling): schema in `src/lib/db/schema.ts`, `drizzle-orm/bun-sqlite` driver, migrations in `drizzle/` via `bun run db:generate`, applied automatically on connection.
- **Zod validation** at all API boundaries; shared schemas in `src/lib/schemas.ts`.
- **`src/config/index.ts` is the single source of ALL configuration** — no `process.env` reads elsewhere. Vault key env var is `VAULT_KEY` (user-chosen name); DB URL from `DATABASE_URL` (default `file:./local.db`).
- **Brand assets** generated to `public/relay_x32.ico` + `public/relay_x512.webp` (ffmpeg) and wired via `config.assets` in layout metadata; no icon files in `src/app`.
- README rewritten with setup/scripts/layout documentation.

## Post-Task-2 Amendments (2026-08-31, human-directed)

- **Turso/libSQL adopted** (supersedes `drizzle-orm/bun-sqlite`): `src/lib/db/index.ts` now uses `drizzle-orm/libsql` + `@libsql/client`; `config.database.url`/`authToken` already supported this (`turso://` normalized to `libsql://`, `DATABASE_TOKEN` read) but the driver hadn't been switched over yet. Local dev can still use `file:./local.db` (no token); production points at a Turso `libsql://` URL.
- **Migrations no longer run automatically on connection.** libsql's `migrate()` is async but `getDb()` is called synchronously throughout the codebase (e.g. `vault.ts`), and auto-migrating per-connection let concurrent Next.js build workers race to migrate the same database (root cause of the Coolify build failures around commits `eb85f86`..`b7df1bb`: `drizzle-orm`'s sqlite migrator reads the "last applied migration" row before opening its transaction, so parallel workers could both decide a migration was pending and both apply it). Migrations are applied solely via the explicit `bun run db:migrate` step (Dockerfile CMD runs it before `next start`).
- **`drizzle.config.ts`** switched to `dialect: "turso"` with `dbCredentials: { url, authToken }`.
- **Better Auth drizzle adapter schema fix:** `src/lib/auth.ts`'s `authSchema` now aliases both the base model name and the configured `modelName` override to the same table (e.g. both `verification` and `auth_verifications` → `schema.authVerifications`) — the adapter's `getSchema(model)` looks up `schema[model]` where `model` is sometimes the base name and sometimes the override depending on the code path; only aliasing the base name caused a 500 on Google sign-in (`BetterAuthError: The model "auth_verifications" was not found in the schema object`).

## Docker / Coolify Deployment Notes (2026-09-01)

Coolify facts that shape the files: build pack is `dockercompose`, the target
is a **4-CPU arm64** host, `force_docker_cleanup` prunes daily (so the layer
cache is warm within a deploy, not across weeks), and Coolify rewrites every
service's image to `<resource-uuid>_<service>:<sha>` — which is why `relay`
and `worker` each build the Dockerfile instead of sharing a tag.

- **The `worker` service was recompiling the whole Next.js app on every
  deploy.** Only `relay` passed the `NEXT_PUBLIC_*` build args; those are
  baked into `ENV`, so from that layer down the worker's cache key differed
  and Docker rebuilt everything below it. Measured on the new Dockerfile: an
  arg change re-runs `bun run build` in **16.4s**, identical args make the
  whole build a **3s** cache hit. The worker service now passes the same
  args. On the old Dockerfile an arg change also re-ran `bun install`,
  because the ARG/ENV block sat above it — installation now comes first.
- **Three stages** (`deps` → `builder` → `runtime`). The builder has no media
  binaries (it never shells out) and the runtime never sees Bun's global
  install cache or `.next/cache`. Runtime contents are copied explicitly
  rather than with `COPY . .`, because one image runs three things needing
  different slices of the repo: `next start` (.next, next.config.ts, public),
  `db:migrate` (drizzle.config.ts, drizzle/, src/config) and
  `bun scripts/worker.ts` (scripts/, src/, tsconfig.json for `@/*`).
- **Size barely moved: 2003 MB → 1960 MB.** Bun hardlinks its install cache
  into `node_modules`, so dropping the cache reclaims almost nothing. The
  image is `node_modules` 1179 MB + `/usr` 721 MB. The remaining win is a
  `--production` install, worth ~165 MB (`@biomejs` alone is **131 MB**,
  `typescript` 23 MB) — NOT DONE, because `bun run db:migrate` shells out to
  `drizzle-kit`, a devDependency. Taking it means either moving drizzle-kit
  to `dependencies` or migrating through `drizzle-orm/libsql/migrator`
  instead, which changes the production migration path. A human call.
- **`oven/bun:1` had floated to 1.4.0** while local development is on 1.3.1 —
  production was running a different Bun minor than anything was tested on.
  Pinned to `1.3.1-slim`, and Dragonfly pinned to `v1.40.1` for the same
  reason (`:latest` is re-pulled on every deploy).
- **`init: true` on the worker only.** It is the only service that spawns
  children (yt-dlp, ffmpeg, instaloader); Bun as PID 1 does not reap orphaned
  grandchildren. Verified: `/proc/1/comm` is `docker-init`.
- **Worker liveness** `src/lib/queue/health.ts` — a loopback `Bun.serve` on
  `QUEUE_HEALTH_PORT` (3001) reporting `worker.isRunning()`. Without it Docker
  and Coolify can only see that the process exists, which stays true after
  BullMQ stops consuming. Never published; the container's healthcheck is the
  only caller.
- **`depends_on: relay` on the worker is a migration ordering constraint**,
  not a runtime one — `relay`'s CMD runs `db:migrate`, and a worker that
  picks up a job against an unmigrated schema fails it.
- **Not done, deliberately:** running as the non-root `bun` user would change
  the ownership expectations of the already-provisioned `relay_data` volume;
  and the relay healthcheck queries remote Turso every 30s (~2,880 queries a
  day) because `/api/v1/health` lists `sqlite_master`.
- **Verification**: both images built and diffed; new image booted end to end
  on a local network — `db:migrate` applied all 6 migrations into a fresh
  database and `/api/v1/health` returned all 9 tables; the worker connected to
  Dragonfly v1.40.1 and its health endpoint returned
  `{"status":"ok","queue":"relay-runs","concurrency":2}`; `yt-dlp 2026.03.17`,
  `instaloader 4.15.3`, `ffmpeg 5.1.9` and `bun 1.3.1` all present in the
  runtime image.

---

## Session capture removed; cookie import in its place (2026-09-02)

**Human decision.** The capture service is deleted, not deprecated. Two
reasons, both measured:

1. **Google will not authenticate a CDP-attached browser.** A real sign-in
   returned *"This browser or app may not be secure."* That is policy. No
   flag, user-agent or profile change gets past it, so server-driven YouTube
   auth was never achievable — the feature could only ever have served one of
   its two providers.
2. **Build time.** The `capture` stage installed chromium, chromium-sandbox,
   xvfb, xauth and fonts (~400MB). The operator's words: *"it make my app
   deployment very slow."*

Instagram capture *did* work end to end (real account, real Reel, no
checkpoint) — this was not a technical failure on that side. It was one
provider's worth of value for a whole browser in the image.

**What the user does now:** installs "Get cookies.txt LOCALLY", signs in
normally in their own browser, exports from the provider's export page, and
uploads the file. `src/components/vault/cookie-import-steps.tsx` renders the
instructions from the registry, so they are per-provider without the
component naming a provider.

**Deleted** (~1,400 lines): `src/lib/capture/{cdp,chromium,screencast,server,
session,tickets}.ts`, `scripts/capture.ts`, `connect-session-dialog.tsx`,
`session-canvas.tsx`, `src/server/capture.ts`, `src/lib/query/capture.ts`, the
`capture` Docker stage, the `capture` compose service, and the whole
`config.capture` block with its 12 env vars.

**Kept and moved** to `src/lib/social/`: `providers.ts` (the registry) and
`cookies.ts` (`toNetscapeJar` + `isComplete`). Neither ever knew where its
cookies came from, so the pivot did not touch their logic — the registry only
gained `exportUrl` and `caution`, which the instructions need.

**Cleaning is the security boundary.** The instructions say exporting
*everything* is fine, which is only honest because the domain allowlist runs
before storage. Verified: a jar carrying a bank and a webmail cookie next to a
real Instagram session stored 8, discarded 2, and neither foreign value
reached the stored jar. Eight parser cases pass, including a JSON export
(named as such, so the user knows what to change), a signed-out export, an
expired `sessionid`, and CRLF.

**Found and fixed en route — a redaction bypass in the logger.**
`traceBody` (`src/lib/observability/logger.ts`) sliced the RAW request body
whenever it exceeded `MAX_TRACE_BODY_LENGTH` and returned it *unredacted*, so
the size guard doubled as a way around redaction: any request big enough to
trip it was logged verbatim. A cookie import is tens of KB and would have
written the user's whole social session to OpenObserve. Now redacts first and
truncates the redacted output. Pre-existing, and it applied to every oversized
body, not just this route.

The import field is named `cookieJar` deliberately: `isSensitiveKey` splits
camelCase and matches the word "cookie". Naming it `jar` would have logged it.

**Risk #3 is retired, not mitigated.** The user's password no longer reaches
this server at all.

## instaloader removed — §1.2 Branch A (2026-09-02)

Landed in the same change, because the phase it was sequenced behind (§1.2
"Non-negotiable sequencing") was the capture work, which was itself deleted.
Authenticated downloads were proven against a real jar *first*. Recorded as a
deviation in SESSION_AUTH.md §1.2 rather than glossed.

The §1.2 experiment ran in full: (a) and (b) passed, (c) passed on everything
but `title`, which yt-dlp reports as `"Video by <username>"`. instaloader
never had a title either — `mapInfo` synthesized one from the caption's first
line, and yt-dlp puts that same caption in `description`. So the synthesis was
ported (`withSyntheticTitle`), not the downloader kept. It now yields
`"29g protein & 405 calories per serving 🍛"` on the test Reel, matching
instaloader. The rule matches on data, not a source id, and leaves real titles
containing "by" alone.

**Also measured:** yt-dlp's read-write jar rewrite leaves a real Instagram
`sessionid` byte-identical and rotates only `rur`. An earlier note that the
SID vanished after a failed fetch was an artefact of a bogus test SID. The
`succeeded` gate in `src/lib/media/cookies.ts` stays as a safety net but is
not load-bearing for Instagram.

Python, pip and instaloader are gone from the runtime image — a build-time win
that hits `relay` and `worker`, independent of the Chromium one.

**Not yet done:** no deploy has been run against this. Image size and build
time are claimed from what was removed, not from a measured build.

## Connect wizard: incognito gap and a small-phone blocker (2026-09-02)

Two gaps the operator spotted, both real:

* **Extensions are disabled in private windows by default.** The wizard sent
  YouTube users into an incognito window without saying so, and they would
  have reached the export step, found no extension in the toolbar, and had no
  way to tell that apart from a failed install. Step 1 now carries the enable
  instruction with a COPYABLE `chrome://extensions` / `about:addons` -
  copyable rather than a link because browsers refuse to navigate to those
  schemes from page content, so a link would look clickable and do nothing.
* **No web page can open an incognito window.** The "Open sign-in" button
  opened a normal tab, which is precisely the mistake the warning one line
  above it was describing. Where a private window is required the wizard now
  leads with the keyboard shortcut plus a copyable sign-in URL, and the button
  is demoted to ghost and relabelled "Open in a normal tab instead" so it
  cannot be mistaken for the happy path.

Driven by a new `requiresPrivateWindow` flag on the registry rather than more
prose, because it changes what the UI can OFFER, not just what it says.
Instagram is false and is visually unchanged - verified.

**Blocking bug found while verifying this, not by typecheck or lint.** The
added content pushed the tallest step to 848px, and on an iPhone SE (375x667)
the dialog centred at top:-90 / bottom:757: header clipped off the top, Next
below the fold, nothing to scroll. The wizard was unfinishable on a small
phone. Fixed with `max-h-[90svh]` plus `grid-rows-[auto_minmax(0,1fr)_auto]`
and a ScrollArea body - the max-height alone was NOT enough, because a grid's
auto rows do not shrink to a capped container and the footer still rendered
outside the panel. Re-measured: dialog 600px in a 667 viewport, Next at
538-574, reachable.

Verified with agent-browser: both providers, dark and light, 1280x950, 390x844
and 375x667, reduced motion forced. Zero console errors after a clean dev
restart.

## Deferred: YouTube is IP-blocked on the production host (2026-09-02)

**Status: RESOLVED 2026-09-03 by an egress proxy — see "YouTube egress proxy"
at the end of this file.** The measurements below stand and are why the fix
took the shape it did; only the "what to do about it" is superseded. Both
levers named here were tested and only one of them worked, which is recorded
in the new section rather than left implied.
Instagram is unaffected and working. Only YouTube fails, and only from prod.

### What was measured, not guessed

Same pinned yt-dlp (`2026.03.17`), same video (`K6Oy8QRgTdU`), same vault:

| | production (Oracle VPS, <prod-host>) | a residential connection |
| --- | --- | --- |
| with a cookie jar | every client: "Requested format is not available" | works (`251`/`96`) |
| signed out | every client: "Sign in to confirm you're not a bot" | works (`251`) |

Four clients were tried in production each time (`default`, `web_safari`,
`web_embedded`, `mweb`). The signed-out message is YouTube's bot check
verbatim; the signed-in one is the documented PO-token symptom — the wiki
says a missing token yields "HTTP 403 errors **or** report formats as
unavailable". Two different refusals of the same request, both keyed to the
server's address. The item is public and the credential is healthy.

### This supersedes §1.1b of SESSION_AUTH.md

That entry rejected PO tokens on two grounds, and the ground has moved under
the first one:

- *"the bot check has decayed"* — it is back, measured above. The same entry
  anticipated this: "Cookies remain the answer if the bot check returns."
  They are not: cookies were measured against it today and the signed-in
  request is refused too, just differently.
- *"PO tokens do not guarantee bypassing 403 errors or bot checks"* — still
  true, and still the reason this is a gamble rather than a fix.

### The chosen direction, and its cost

The user picked the PO token provider (`bgutil-ytdlp-pot-provider`) to try
first, because it is free. Before starting, weigh what it actually costs:

- A **fourth compose service** (`brainicism/bgutil-ytdlp-pot-provider`, port
  4416). The capture service was deleted a day earlier *specifically* to stop
  deploys being slow — this walks part of that back.
- It is **Node.js ≥20 or Deno**, which is why `SESSION_AUTH.md` §1.1b called
  it a collision with the Bun-only rule. As a separate container it does not
  put Node in Relay's image, so the collision is weaker than it was — but it
  is still a second runtime in the stack.
- The plugin must reach the **standalone yt-dlp binary**, which has no pip.
  Install path: drop `bgutil-ytdlp-pot-provider.zip` from the release into a
  yt-dlp plugin directory in the runtime stage. Requires yt-dlp ≥ 2025.05.22
  (we pin 2026.03.17, so this is satisfied).
- Point the plugin at the sidecar with
  `--extractor-args "youtubepot-bgutilhttp:base_url=http://<service>:4416"`.
  It defaults to `127.0.0.1:4416`, which is wrong across compose services.
- yt-dlp confirms none is installed today: `PO Token Providers: none`.

**If it does not work**, the remaining lever is the one the evidence points
at directly: route yt-dlp through a residential proxy (`--proxy`, one env
var). It costs money, but only `bestaudio` is ever fetched — a Short is
1-2 MB — so even a per-GB plan lasts a very long time.

### Already shipped, so this is a degraded feature and not a broken one

The failure is now reported honestly rather than blamed on the user:
`BOT_CHECK` in `src/lib/media/download.ts` classifies it `SOURCE_UNAVAILABLE`
and says the server is being challenged. It is tested BEFORE `UNAVAILABLE`
because "Sign in to confirm you're not a bot" contains "sign in" — without
that ordering it reads as `SESSION_EXPIRED`, tells the user to reconnect a
working session, and burns a reject against the credential.

## List-page structure unified (2026-09-02)

Runs, agents and credentials were three hand-written variants of the same
page. Only one had a sticky header, none capped their height, and the whole
page scrolled — so column headings left the screen after six rows and the
pager went with them.

### The structure

`ShellContent fill` → fixed-height flex column, no ScrollArea, page cannot
scroll. `ScrollPanel` → claims the leftover height and scrolls its content.
`DataTable` → the table, its sticky header and its column widths.

Codified in RULES.md under "List pages". The short version: only one thing
on the page scrolls, and it is never the page.

### Two dead ends worth not repeating

**A height calculation.** The first version capped the table with
`calc(100svh - 14.875rem)` — a number obtained by measuring the chrome above
and below it on one viewport. It produced the two-scrollbar bug the moment
anything else changed height, because the number described a layout instead
of following it. `SidebarInset` is already `h-svh` with a `shrink-0` header,
so `flex-1` gives the exact remainder for free.

**One box for the panel.** `flex-1` alone always fills, which left 755px of
empty bordered space under the Vault's six credentials. `max-h-full` alone
caps against the whole column, siblings included, so a full page overflows
by the height of the status bar and pager. Claiming the space and consuming
it have to be separate elements — hence the outer/inner pair in
`ScrollPanel`.

### Measured after the change

| | box | table | scrolls | page scrolls |
| --- | --- | --- | --- | --- |
| runs, 20 rows | 1076 | capped | yes, 1586 > 1074 | no |
| agents, 4 rows | 278 | 276 | no | no |
| vault, 6 rows | 392 | 390 | no | no |

Header held at a constant offset while the first row travelled to -327, and
exactly one scrollbar exists on the page — the table's.

### A note on verifying this in dev

Two false conclusions were reached and corrected while checking it. The
preview tab drifted to a different route between probes, and a hard load of
a freshly edited route needs ~12s for Turbopack to compile it — a 4s probe
sees the Suspense fallback and looks like a hang. An A/B against `HEAD` was
briefly read as "this change broke agents"; it had not. Assert
`location.pathname` inside the same probe that measures, and give a hard
load after an edit at least 12 seconds.

## YouTube egress proxy (2026-09-03) — CODE DONE, NOT DEPLOYED

Supersedes the "what to do about it" half of the deferred section above.
Resolves it: YouTube works from production again, anonymously, on the
default player client.

**Status: code complete and validated on the production host in throwaway
containers. NOT committed and NOT deployed — both need the user. The deploy
needs one Coolify variable.**

### The decision, and the objective it changed

The task began as "make `@hoangquyet/ytdown` the primary YouTube
downloader". That is ABANDONED, on evidence:

* Phase 0 of that plan failed. ytdown 1.0.2 is bot-checked from the prod IP
  on 8 of 9 videos (the 9th, `dQw4w9WgXcQ`, is the package README's own
  example and succeeds — running Phase 0 against only the README URL would
  have read as a clean pass).
* `YTW_SESSION` is never consulted on that path: `resolve()` calls
  `tube.player()`, which throws the bot check, before any session lookup at
  `downloader.js:649`. The session feature cannot rescue it.
* ytdown has NO proxy support of any kind — `src/net/http.js` hardcodes
  `node:https` agents with no dispatcher hook. Both levers the objective
  named (a PO-token provider, a residential proxy) are **yt-dlp** levers:
  bgutil is a yt-dlp plugin, `--proxy` is a yt-dlp flag. Neither can be
  aimed at ytdown without patching a zero-dependency package's internals.

So the fix went to the tool already integrated. yt-dlp needed **no code
change to work** — only a flag.

### What was measured, and where

12 real Shorts, the pinned `yt-dlp 2026.03.17` from the running app image,
our own `-f bestaudio/best`, the same client chain, minutes apart:

| egress | result |
| --- | --- |
| direct from the VPS | **0/12** — every one "Sign in to confirm you're not a bot" |
| through the WARP sidecar | **11/12** — all on the DEFAULT client |
| a residential connection | **11/12** — byte-identical files |

The twelfth (`LiH-P4rSkLI`) 403'd from a residential connection too — on
the yt-dlp pinned at the time; it downloads fine on `2026.08.19`. **This
closes the gap to residential; it does not beat it.** Nothing in the code or
its comments should be read as claiming otherwise.

A trap worth recording, INCLUDING the wrong conclusion first drawn from
it: four long-form music videos (`dQw4w9WgXcQ`, `kJQP7kiw5Fk`,
`9bZkp7q19f0`, `n5t23nvU_t0`) 403'd through the proxy, and it looked
exactly like a proxy limitation. The residential control failed on the
**same four**, byte-identical, so it was recorded as source-side and
unrelated to egress.

**SUPERSEDED 2026-09-03: it was a stale yt-dlp.** All four, plus
`LiH-P4rSkLI` and the Shorts that broke in production, download fine on
`2026.08.19`. The residential control did correctly rule out the network —
but "fails everywhere" was then read as "unfixable", conflating a
source-side problem with a bug in our own tool. A/B the version before
concluding anything about a widespread 403; it is one download and it is
decisive.

### The PO-token lever: works, and is not needed

Tested rather than assumed, because the deferred section above had chosen it
as the direction. `bgutil-ytdlp-pot-provider` 1.3.2 ran on prod, the plugin
loaded as `bgutil:http-1.3.2`, and it minted a genuine token —
`Generating a gvs PO Token for web client via bgutil HTTP server`.

It changed **nothing**: 5/9 with it, 5/9 without. On the default client
yt-dlp never requests a GVS token at all, so there was no gate to open.
Forcing `player_client=web` (which does require one) returns "Requested
format is not available" — the signed-out web-client limitation, not a token
failure.

**Do not reach for bgutil again without first confirming the failure is
actually a GVS 403 on a client that requires a token.** It costs a Node
sidecar and a port to buy nothing at present.

### Why Cloudflare's own client, and not the popular WireGuard wrapper

The first attempt used `wgcf` plus `wireproxy` for a userspace tunnel. It
worked (11/12, identical bytes) but was rejected: `pufferffish/wireproxy`
now redirects to `windtf/wireproxy` — the repository changed hands, and it
publishes prebuilt binaries. That is not a supply chain to put a production
egress on.

What ships instead runs Cloudflare's **official** `warp-svc` daemon, exposed
as SOCKS5 by gost, pinned to `caomingjun/warp:2026.7.1377.0-2.12.0`. The
pinned tag was re-measured, not assumed from `latest`.

### Shape of the change

Deliberately not "add WARP support". The pipeline reads a **URL**, so
swapping to WARP Connector, a Zero Trust plan, or a commercial residential
proxy is one variable and no code change.

* `sources.ts` — a `proxied` flag on the source registry, resolved onto
  `ParsedSource` at parse time. `download.ts` therefore decides by reading a
  boolean and still names no platform (RULES.md). YouTube true, Instagram
  false.
* `config/index.ts` — `media.proxyUrl` from `MEDIA_PROXY_URL`. Empty
  disables it; that is the rollback for the entire feature.
* `download.ts` — `--proxy` when the source opts in AND a URL is set, so a
  deployment without one runs exactly as before.
* The proxy itself is a SEPARATE Coolify resource, `warp-egress`, not a
  service in `docker-compose.yml`. It was built as a compose sidecar first
  and moved on the user's instruction. **Operational cost of that choice,
  recorded because it will bite someone:** Coolify puts a standalone
  resource on the shared `coolify` network, `--network` in Custom Docker Run
  Options is silently STRIPPED (tried, does not work), so the container must
  be `docker network connect`-ed to the app network with alias `warp` after
  every one of its own deploys. Full runbook in EGRESS_PROXY.md.
  Joining the app to the `coolify` network instead would have been the easy
  fix and is REJECTED: 7 other containers sit there and Dragonfly runs with
  an empty `requirepass`, so it would expose the unauthenticated job queue
  to every other app on the box. Attaching warp inward is the narrow
  direction — warp holds no secrets.
* Coolify auto-assigned `warp-egress` a public domain from the server
  wildcard at creation. Removed before it ever served traffic. `gost -L
  :1080` auto-detects HTTP as well as SOCKS5, so that route would have been
  a usable OPEN PROXY. Never give this resource a domain.

### Two failure modes that had to be got right

**A dead proxy must not look like a dead session.** `PROXY_UNREACHABLE` is
tested FIRST, ahead of the 403 branch, because the SOCKS layer reports a
refused tunnel as a 403 in some yt-dlp versions — read as `CLIENT_REFUSED`
that classifies permanent and the run never retries, so a few seconds of
sidecar restart would permanently fail every overlapping run. It resolves to
`DOWNLOAD_FAILED`, the retryable code, and it also breaks out of the
fallback loop: re-running an unreachable proxy under three more player
clients cannot help and only delays the real error.

Verified on prod with the real `download()`:

```
MEDIA_PROXY_URL=socks5://relay:hunter2@warp:9999
  -> code=DOWNLOAD_FAILED, one attempt, no fallback walk
MEDIA_PROXY_URL=            (cleared)
  -> code=SOURCE_UNAVAILABLE, bot-check message, full chain — the old path
instagram URL + dead proxy
  -> proxied=false, never touches the proxy, fails for its own reason
```

**The proxy URL is a credential.** It may be `socks5://user:pass@host`,
yt-dlp echoes the proxy it was handed when it cannot reach it, and
`lastLine`'s output is stored on the run and rendered to the user. So
`scrubProxy` runs at the single point stderr enters the program rather than
at each point it leaves; `proxy` was added to the logger's redaction words
while `proxied` — the boolean the download step logs — deliberately was not,
keeping the diagnostic without the secret.

Shown, not asserted: `bun run verify:proxy` puts a canary password through
five real yt-dlp failure shapes and a log record. 8 paths, 0 leaks. It fails
loudly if the canary is not armed, because `scrubProxy` short-circuits on an
empty proxy and would otherwise pass while testing nothing.

### Open, and the honest caveats

* **Free WARP is a CONSUMER product.** Using it as server-side egress is
  outside its intended use; Cloudflare may rate-limit or block it. The
  sanctioned paths are WARP Connector or a Zero Trust plan. This is a
  business call, and it is the main risk in the whole change.
* **One shared exit.** If it is flagged, everything fails at once, where a
  proxy pool would degrade gradually.
* **The signed-in path is UNTESTED.** Anonymous is 11/12, so cookies are no
  longer needed for public Shorts and the Vault's "Connect YouTube" wizard
  is no longer load-bearing for basic YouTube function — which dissolves
  most of the Phase 1 dilemma. What is untested is whether a signed-in jar
  is ACCEPTED from a WARP address, and whether routing a live Google session
  through a foreign consumer IP trips Google's account-security heuristics.
  Current behaviour sends the jar through the proxy when one exists. Only
  the account's owner can test this, and it should be tested on an account
  they can afford to have challenged.
* **A free-proxy pool also works** and was measured: 1888 raw proxyscrape
  entries -> 484 that tunnel TLS from prod -> 34/60 clearing the bot check
  -> 32/34 still working 20 minutes later, latency 12-114s. Rejected in
  favour of WARP: 2-3s instead, one known operator instead of unknown hosts
  (many open proxies are misconfigured or compromised machines whose owners
  did not consent), and no pool refresh, health-scoring or retry logic to
  build and maintain. Recorded because it is the fallback if WARP is
  blocked, and because measuring it cost real time.

### A correction worth keeping

An earlier report in this work said "6 of 8 downloads succeeded" for the
free-proxy pool. That was 8 attempts at ONE video, not 8 videos — it
measured proxy reliability and never per-video coverage, and it read as
stronger evidence than it was. The 12-Short table above is the measurement
that actually answers the question.

## Per-stage run logs (2026-09-03) — DONE

The run detail stage rail now carries a collapsible log stream per stage.
Live lines come from Dragonfly, older runs are read back out of
OpenObserve; neither needed a schema migration, which is why the split
exists.

Capture is a pino `mixin` plus an `AsyncLocalStorage` run context, so every
existing `logger.*` call is attributed to a run AND a stage without one
call site changing — `src/lib/media/download.ts` logs `{ source, item_id }`
and has no idea a run exists, yet its lines group correctly.

### Three findings that only surfaced by running it

**A CREDENTIAL LEAK, now closed.** `redactLogValue` was applied only to
HTTP trace bodies; `logger.*` calls went straight to pino unredacted. That
was survivable while logs went to stdout and OpenObserve and the rule was
"never log a secret at the call site". These lines are RENDERED IN THE
PRODUCT, so one careless field would put a token on a page. Redaction now
runs inside `RunLogStream`. Proven with a canary: a log record carrying
`api_key` came back `[REDACTED]`.

**Every `logger.debug` in the codebase was being discarded.**
`pino.multistream` filters each stream at `info` unless given a level, and
none of the three streams had one. `level: "debug"` is set on the run-log
stream ONLY — the live view is complete, while stdout/file/OpenObserve
volume is unchanged. Consequence to remember: the historical (OpenObserve)
view is info-and-above, so it is thinner than the live one.

**Run logs need their OWN Redis client.** The shared `getRedis()` sets
`enableOfflineQueue: false` so an enqueue fails loudly, which is correct
for a job but wrong for a log line: the first append after a process start
arrives before the socket is ready and threw "Stream isn't writeable",
silently dropping every line of the first run after a deploy. `getRunLogRedis()`
opts into buffering. `connection.ts` already documented this trap "for the
next caller that is a read" — this was that caller.

### Deliberate restraint

No entrance or stagger animation on log lines. They are data being read,
and motion there hinders; only the disclosure itself and its chevron
animate. Timestamps use a module-scope `Intl.DateTimeFormat` (not a hand
rolled pad, and not a new dependency) because a panel can hold 500 rows and
re-renders every poll while a run is live.

## Notion: transcripts and the Agent column (2026-09-03) — DONE

Two additions to the published page, both requested by the user.

### Transcripts, last and collapsed

The two transcript streams are appended to the page in Notion `toggle`
blocks, which are collapsed on creation and have no property to change
that — exactly the behaviour wanted.

Only TWO streams exist, and this is worth knowing before someone is asked
for a third. Whisper returns the native script and `toRomanScript`
transliterates IN PLACE, so `roman.text` IS the verbatim record, in Latin
script. There is no separate native-script original retained anywhere.
Publishing one would mean changing the transcription layer to keep it, not
changing the renderer.

Placed after the attribution caption, so the extracted content stays the
page and the transcript reads as the evidence behind it.

`chunkText` splits on WORD boundaries at 1800 characters, capped at 24
chunks. Both numbers are constraints rather than taste: Notion rejects a
rich-text run over 2000, and every chunk is a separate block counted
against the 100-per-request limit. Mid-word truncation matters more than
usual here — these are phonetic transliterations, so a broken word is
unreadable and indistinguishable from a mistranscription. A transcript that
hits the cap says so in a final line rather than trailing off.

Verified by rendering, not by reading: a 4000-character transcript produced
3 children of 1797/1790/490, none over 2000, each ending on a whole word,
and an all-whitespace stream produced no toggle at all.

### The Agent column

`buildProperties` fills a property whose name contains "agent", as
`rich_text`. NOT `select`: a select gains an option per agent name and the
user cannot rename one without orphaning the rows already using it.

Two paths, because the two cases are different:

* Tables Relay creates get `Agent` up front (`notion-guides.ts`).
* Tables that PREDATE the column get it added by `ensureAgentColumn` on the
  next publish, via `PATCH /v1/data_sources/{id}` with the same
  `{ Agent: { rich_text: {} } }` shape `databases.create` uses.

`buildProperties` only ever fills columns that EXIST, which is what keeps
it safe against a table the user shaped themselves — but it also means the
migration was necessary, or an existing table would have silently never
shown a value.

The add is logged at INFO on success, deliberately. It runs once, against a
schema the integration may only have read access to, and a failure is
swallowed so a missing column can never cost a published page. Without the
success line, "could not modify" and "modified fine" look identical from
the outside.

### Also: `notion.ts` was split

Row properties moved to `src/lib/render/notion-properties.ts`. The file was
over the 250-line cap after `ensureAgentColumn`, and the two concerns move
at different rates — block rendering changes when the document shape
changes, column mapping changes when the user reshapes their table.

## Durable YouTube ingestion (2026-09-03) — CODE DONE, NOT DEPLOYED, AWAITING APPROVAL

Two defects on the same failure path, fixed in that order. Both were already
written down as known weaknesses (RUNBOOK.md §8.1 and §4.3), which is the
only reason they were cheap to find.

### 1. `warp` is a compose service again

The proxy was a standalone Coolify resource. Coolify puts those on its
shared `coolify` network while the app's containers sit on the app's own,
**they cannot see each other**, and `--network` in Custom Docker Run Options
is silently STRIPPED (tried previously; it does not work). The only thing
that ever made `socks5://warp:1080` resolve was a hand-run
`docker network connect --alias warp`, and because that attach lives on the
CONTAINER it was destroyed by every redeploy or restart of the proxy. So
YouTube ingestion depended on someone remembering one command, forever.

Compose attaches every service in the file to the app network and aliases it
by service name — the same mechanism `redis://dragonfly:6379` already relied
on. Moving it back removes the step rather than documenting it better.

Joining the APP to the shared network is the other direction and stays
REJECTED: Dragonfly runs with an empty `requirepass`, so it would expose the
job queue to every other container on the box. Attaching warp inward is the
narrow direction; warp holds no secrets.

Decisions inside the service block, each one deliberate:

* **Pinned** `caomingjun/warp:2026.7.1377.0-2.12.0`, the tag §1 of
  EGRESS_PROXY.md was measured on. `latest` would let the thing every
  YouTube fetch traverses change under a deploy that touched only app code.
* **No `ports:`.** `gost -L :1080` auto-detects HTTP as well as SOCKS5, so a
  published 1080 on a public VPS is an open relay for anyone scanning the
  host. `expose` documents the port without opening it.
* **`cap_add: MKNOD, AUDIT_WRITE, NET_ADMIN` plus `device_cgroup_rules: c
  10:200 rwm`.** The image's own documented required set: MKNOD with the TUN
  device rule to create `/dev/net/tun`, NET_ADMIN to configure the interface
  and its routes, AUDIT_WRITE for warp-svc's dbus layer. The task asked only
  for NET_ADMIN; the other three are what the image needs to bring the
  tunnel up at all.
* **`sysctls: net.ipv4.conf.all.src_valid_mark=1`.** WireGuard routes on its
  own fwmark and the kernel discards the replies as martians without it —
  the symptom is a tunnel that comes up and carries nothing.
* **`net.ipv6.conf.all.disable_ipv6=0` deliberately NOT set**, though the
  image documents it. Docker refuses to start a container whose sysctl the
  kernel does not expose, so on a host booted with IPv6 off that one line is
  the difference between "no IPv6 egress" and "no egress at all". Nothing
  here needs IPv6.
* **A named volume for `/var/lib/cloudflare-warp`.** Free WARP enrols
  anonymously on first start; on a fresh volume it enrols again and takes a
  DIFFERENT exit address. Persisting it means a restart keeps the address it
  was measured on, and makes the documented recovery from a blocked exit
  (drop the registration, restart, re-enrol) a deliberate act instead of the
  default behaviour.
* **A healthcheck that proves the TUNNEL, not the port.** `curl` through the
  local SOCKS listener to `cdn-cgi/trace`, requiring `warp=on` or
  `warp=plus`. A port check passes while gost listens and WARP is
  disconnected — which is precisely the state that fails every YouTube run,
  so a port check would report healthy straight through an outage. Its
  timings are its own rather than the shared anchor: first boot has to enrol
  a device, and the probe is a full TLS round trip over a consumer tunnel.
* **NOT in the worker's `depends_on`.** Only sources flagged `proxied` use
  it. Gating the worker on a free-tier consumer tunnel would stop INSTAGRAM
  ingestion every time Cloudflare throttles WARP. A YouTube fetch with the
  tunnel down fails `DOWNLOAD_FAILED`, which the queue retries.

`MEDIA_PROXY_URL` needs no change: the Coolify env var is already
`socks5://warp:1080` and compose defaults to the same value, so the two
cannot disagree by accident. The old `warp-egress` resource is now
unreferenced and should be stopped.

### 2. Classification reads the most informative attempt, not the last one

`downloadWithYtDlp` walks the default client then each
`YT_DLP_YOUTUBE_CLIENTS` entry, and kept only the LAST attempt's stderr for
classification. The clients do not fail in order of usefulness. Measured
production shape: the default client returns **403** — the diagnosis, and
the thing that points at a stale yt-dlp pin — and a later client returns
"Requested format is not available", which says nothing about anything. The
403 was overwritten, the run was reported as an extractor problem, and
RUNBOOK.md §5 (A/B the pin, which was the actual fix) was never reached.

The ladder is now applied to EVERY attempt and the one landing on the
highest rung decides. The rung ORDER is unchanged, and two of its guarantees
came out stronger rather than merely preserved:

* proxy-unreachable is still rung 1 and still `DOWNLOAD_FAILED`, the one
  retryable code. It gained a guard: it fires only for an attempt that
  ACTUALLY used the proxy, so an unproxied source can no longer be diagnosed
  as our egress failing because the word "proxy" appeared in somebody
  else's error text.
* `SESSION_EXPIRED` requires that **the attempt being classified** supplied
  a jar — `withCookies` is recorded per attempt rather than read off the
  enclosing run, which is what the old code's `cookiesPath` test did.
* The 403 message was reworded because ranking made the old wording
  inaccurate: "refused every available client" was only true when the 403
  came last. It now reads "the source refused this server with HTTP 403, and
  no other client succeeded either" — true in both cases, and still naming
  the real cause. RUNBOOK.md §4.2 and EGRESS_PROXY.md §5 match.
* Equal-ranked attempts keep the EARLIEST, which is the default client: it
  resolves the richest format set, so where two clients say the same kind of
  thing, its wording is the one worth showing.

The retry loop is untouched — an unreachable proxy still breaks out of the
fallback walk immediately, so a proxy outage costs one attempt and not four
timeouts.

The `Download failed` log line now records `cause` and `deciding_client`, so
a wrong verdict can be traced from logs instead of a local reproduction,
which is exactly what diagnosing the `tv` client cost last time.

### Shape of the change

`download.ts` was 513 lines, well over the 250 cap, so the patterns and the
ladder moved out rather than growing it further:

* `src/lib/media/failure-patterns.ts` (116) — the six stderr patterns, each
  with the measurement that justifies it. They own the EVIDENCE.
* `src/lib/media/classify.ts` (218) — `YtDlpAttempt`, the ladder as ordered
  data, `rank`, `classifyFailure`. It owns the DECISION.
* `download.ts` (372) — invocation, the fallback walk, `scrubProxy`, info
  mapping. **Still over the cap**, recorded rather than hidden: getting it
  under 250 means moving `withSyntheticTitle` and `scrubProxy`, which
  `scripts/verify-ytdlp.ts` and `scripts/verify-proxy.ts` import, and
  `scripts/` was outside this task's scope.

No provider string entered `download.ts`. The registry still decides via
`ParsedSource.proxied`, and the ladder matches on what a tool SAID.

### Verified locally, on the dev machine

* `bun run typecheck` clean (exit 0). `bunx biome check` clean on all three
  changed `src/` files. Whole-repo `bun run lint` still fails on `main` for
  pre-existing reasons (RUNBOOK.md §8.5).
* `docker compose config` exits 0 on the new file (local Compose v5.4.0; the
  prod host runs v5.0.0, same schema family). Parsed back to confirm the
  anchor merge: 4 services, `warp` present, `warp_data` volume present, no
  `ports:` on `warp`, `warp` absent from `worker.depends_on`.
* `bun run verify:proxy` PASS — 8 paths, 0 leaks.
* Eleven forced failure sequences through the real `classifyFailure`,
  including the exact regression: `403` from `default` followed by
  "Requested format is not available" from two fallback clients now resolves
  `SOURCE_UNAVAILABLE`, cause `client-refused`, from `default`, with the
  message naming the 403 — and the same sequence WITH a jar still does not
  resolve `SESSION_EXPIRED`. Bot-check with a jar, login-shaped without one,
  and a proxy-shaped stderr on a source that goes direct all stay off
  `SESSION_EXPIRED` and off rung 1 respectively.

### Verified in production after the deploy (commit `5eaadd3`)

The worker container that came up at 11:18:17Z on this commit ran a real
Short end to end at 11:19:35Z:

* `Media ingested` — source `youtube`, item `K-tO4eK8WoQ`, **`audio_bytes`
  354861**, `duration_seconds` 44, `downloadMs` 6702, on the DEFAULT client,
  with no `trying the next` and no `Every player client failed` anywhere in
  the log. Transcribed, extracted, published to Notion, `Run completed`.
* A tunnel was definitely in the path: direct-from-the-VPS is 0/12 per §1 of
  EGRESS_PROXY.md, and this succeeded on the first client. A cookie jar was
  supplied (`Session cookies rotated`) and it still succeeded.
* **This run does NOT prove the compose service was the tunnel, and an
  earlier write-up of it claimed otherwise.** The old standalone
  `warp-egress` container was created at 09:18Z and was still running at
  11:19Z, and the hand-run attach that gave it the alias `warp` on the app
  network lives on the CONTAINER — which was never recreated, and the app
  network is `external: true` so a deploy does not rebuild it. Two
  containers can therefore both have answered to `warp` on that network,
  Docker returning both A records, and the run may have gone through either.
  Indirect evidence read as proof; recorded because the mistake is the exact
  one this file keeps warning about.
* `warp-egress` was stopped and DELETED at 11:37Z on the user's
  instruction. The compose service is now the only thing that can resolve
  as `warp` on the app network, so **the next successful YouTube run is the
  decisive test** and it had not been taken at the time of writing.
* Coolify's GENERATED compose — the file it actually deploys, not the one in
  the repo — keeps the service intact: `device_cgroup_rules`, `cap_add`,
  `sysctls`, `WARP_SLEEP` and the healthcheck all verbatim; `networks` set
  to the APP's network rather than Coolify's shared one; no `ports:`; no
  caddy/traefik labels; the warp volume created; and `worker.depends_on`
  still only relay and dragonfly. **The open question of whether Coolify
  would strip `device_cgroup_rules` is settled: it does not.**

### Verified on the dev machine against the REAL download path

Not production, and not interchangeable with it. These exercise the actual
`download()` — real yt-dlp 2026.08.19, the same build as the image pin —
rather than the classifier alone:

* YouTube Short with `MEDIA_PROXY_URL=socks5://127.0.0.1:9` →
  `code=DOWNLOAD_FAILED`, `cause=proxy-unreachable`,
  `deciding_client=default`, and **no `trying the next` line at all**. The
  client chain is not walked for a dead proxy, which is the behaviour the
  break condition exists for.
* Instagram Reel with the same dead proxy → `proxied=false`, went DIRECT,
  and failed on Instagram's own "sent an empty media response … use
  --cookies" rather than on anything proxy-shaped. Were it proxied it would
  have produced the YouTube result above, so this is the control working.

### Still not measured, and not to be written up as if it were

`getent hosts warp` from inside the worker, and the `warp` container's own
healthcheck state, have not been read directly. Coolify's API has no exec,
and the prod host was not reachable from the dev machine — of three
candidates in `known_hosts`, one authenticates but runs only the Coolify
control plane, one rejects both keys, and one presents a changed host key
that was deliberately not auto-accepted.

Now that `warp-egress` is deleted, either of two things closes this: that
`getent` (it should return exactly ONE address, the compose service), or
simply one more successful YouTube run.

A forced proxy failure and a forced 403-then-no-formats have not been run IN
PRODUCTION, because forcing them means pointing `MEDIA_PROXY_URL` at a dead
value on a system that is working. The 403-then-no-formats sequence is
synthetic in any case — real yt-dlp will not produce it on demand — so the
classifier is the right place to check it, and it is checked there.

## Stage log panel: theme tokens instead of a fixed dark slab (2026-09-03) — DONE

Reported as a dark-mode bug from a screenshot: in LIGHT mode the per-stage
log panels on the run detail page were black slabs with an unreadable
"No logs retained for this stage." on them.

The cause was a mix of fixed and themed colours in one component.
`run-stage-logs.tsx` hardcoded `bg-zinc-950` — the app's ONLY fixed-dark
surface outside the modal scrims, and the only file using `text-zinc-*` —
with every tone inside chosen against that black. The empty and loading
states, correctly, used `text-muted-foreground`. In dark mode both halves
agreed; in light mode the token flipped to a dark grey and the slab did not,
so the text vanished into it.

Fixed by making the panel follow the theme (`bg-card`) and putting the text
on semantic tokens (`text-foreground`, `text-muted-foreground`), which
leaves only the three level accents carrying explicit colour — and those now
have the paired `dark:` variants RULES.md § UI requires
(`text-red-700 dark:text-red-400`, and the same for amber and sky) rather
than bare `-400` shades that only work on near-black.

`bg-card` and not `bg-muted`, decided by measurement rather than taste:
computing WCAG ratios from the real token values put `--muted-foreground` on
light `--muted` at **4.39:1**, under the 4.5 bar that applies because this
renders at 11px. On light `--card` the same pair is **4.83:1**, the weakest
accent (amber-700) is **5.05:1**, and every other pair is 5.1–19.9:1. Dark
`--card` (L 0.21) is also darker than `--muted` (L 0.274), so it keeps more
of the terminal feel the file was after in the first place.

Verified with `agent-browser` in both themes at 1440×900 and 390×844, per
the light-mode/mobile mandate. One trap worth recording: a harness that
renders a light panel and a `<div className="dark">` panel side by side does
NOT show both themes. The variant is `&:is(.dark *)` and next-themes puts
`.dark` on `<html>`, so everything nested inside it is dark regardless — the
first screenshot came back dark on both halves. The class on `<html>` has to
be toggled instead.

## OpenObserve reads are 401; ingest is fine (2026-09-03) — DIAGNOSED, NOT FIXED

Found while answering "where do older runs' logs come from". The run detail
page showed "No logs retained for this stage" on every stage of a run that
had just completed successfully.

The immediate cause was the live window: two deploys had restarted Dragonfly
since that run, which wipes it, so the page fell through to the OpenObserve
history path. But history returned nothing either, including for stages that
definitely emitted `info` lines.

Measured directly against `OPENOBSERVE_URL`, with the credential the app is
configured with — verified byte-identical to the Coolify env var, so this is
production behaviour and not a local misconfiguration:

| endpoint | result |
| --- | --- |
| `GET /healthz` | `200 {"status":"ok"}` |
| `POST /api/<org>/relay_server/_json` (ingest) | `200`, `successful: 1` |
| `POST /api/<org>/_search` (the history read) | `401 Unauthorized Access` |
| `GET /api/<org>/streams` | `401` |
| `GET /api/_meta/organizations` | `401` |

**Writes land; reads are refused.** Ruled out a wrong endpoint before
concluding that: `_search?type=logs` and `/api/v2/<org>/_search` are 401
too, as is every other authenticated read. So `OPENOBSERVE_TOKEN` is
accepted for ingest and rejected for query — either the root password it
encodes is stale, or that user has no query permission on the org.

**No application code is wrong.** `run-logs-history.ts` issues the right
request; it degrades to `[]` on any non-OK response, by design, which is
exactly why this was invisible — a 401 and a run that genuinely produced no
logs render identically. The fix is a credential with query rights in
`OPENOBSERVE_TOKEN`, which is a Coolify env-var change and was left to the
human.

Two things worth keeping from this:

* **The failure is silent by construction.** Degrading to empty is right for
  a log panel — absent logs must never fail a run — but it means a broken
  history backend looks like an empty one forever. A one-off probe is the
  only way to tell, hence the table in RUNBOOK.md §4.4.
* **The durable half of the log stream is the less useful half.** `debug`
  lines go only to the live Dragonfly stream (logger.ts sets `level: "debug"`
  on that stream alone), so yt-dlp's own output — the thing worth reading
  when a download fails — is never in OpenObserve at all. Even with the 401
  fixed, a historical Downloading stage can only ever show `info` and above.

## OpenObserve volume, and the 250-line cap closed out (2026-09-03) — DONE

### What was actually shipping to OpenObserve

Asked to stop logging the healthcheck, and to find whatever else could be
excluded. Reading the two logging layers turned up more than the
healthcheck:

* **`src/proxy.ts` is the expensive layer, not the pino stream.** It posts
  to OpenObserve **once per request with no batching**, where
  `OpenObserveStream` buffers 50 lines or 2 seconds. Its matcher excludes
  only `_next/static`, `_next/image` and `favicon.ico`, so every page render
  also logged a request for the logo. Its own comment already noted that API
  responses are "measured again by the Hono middleware" — so for API routes
  it is a duplicate that adds `user_agent` and `request_id`.
* **`/telemetry` was double-stored.** Its request body IS the browser's
  log/RUM payload, which the OpenObserve browser SDK already ships to the
  `relay_client` stream. Up to 8KB of it, per page load.
* **`GET /runs/:id/logs` re-ingested the log store into itself.** The
  response is the run's log lines, `MAX_TRACE_BODY_LENGTH` is 8192, and the
  UI polls every 2s while a run is live. Watching one run for five minutes
  was ~150 polls of up to 8KB of duplicated log content.
* `/health` is Docker's probe: every 30s forever, 2,880 lines a day per
  container, describing a state `docker ps` already reports and which is
  only ever read once the container is known to be unhealthy.

The list lives in `src/lib/observability/skip-paths.ts` with **no imports at
all**, because the two layers that must agree cannot share a config import:
`src/proxy.ts` runs in the EDGE runtime and deliberately reads `process.env`
directly. Same reasoning as `src/lib/media/sources.ts` being dependency-free
so client components can read it. Duplicating the list in two files is what
that avoids.

Dropped at the SINK, not the log site, so stdout and the log file still
carry every line — only durable storage is spared. Matching is exact for
paths and extension-based for assets; `/api/v1/healthcheck` is deliberately
NOT skipped, which a naive `endsWith("/health")` would have got wrong, and
which is in the 17-case check that was run against the predicates.

Body tracing is a SEPARATE decision from dropping the line, because the
problems differ: for the logs endpoint the status and latency are worth
keeping and only the payload is redundant.

**Not done, and worth considering if volume is still a problem:** dropping
`/api/` from the proxy layer entirely. It would roughly halve request volume
and lose only `user_agent`.

### The 250-line cap, closed

RUNBOOK §8.6 recorded `download.ts` at 372 lines and claimed the blocker was
that `withSyntheticTitle` and `scrubProxy` are imported by `scripts/`. Half
wrong: **`withSyntheticTitle` has no importers at all** — the docstring
still says it is exported for `scripts/verify-ytdlp.ts`, which no longer
imports it. Only `scrubProxy` was, by `verify-proxy.ts`.

So the split was cheap. `download.ts` 372 -> **172**, keeping only the
strategy (which clients, in what order, what to conclude):

* `media/ytdlp.ts` (134) — one invocation, the argument list, the per-attempt
  facts, and `scrubProxy`. `verify-proxy.ts` imports it from here now.
* `media/info.ts` (91) — which of the ~500KB info JSON is kept, and the
  synthetic title.

And `logger.ts` 254 -> **189** (it was already over the cap before this
session; adding the sink filter would have made it worse):

* `observability/http-trace.ts` (95) — the Hono middleware that records one
  line per request, and how much of a body it keeps.

Every file under `src/lib/media` and `src/lib/observability` is now under
250. `bun run verify:proxy` still passes 8 paths 0 leaks after the import
move, and the real `download()` was re-run against a dead proxy to confirm
the split did not change behaviour: `cause=proxy-unreachable`,
`DOWNLOAD_FAILED`, no fallback walk.

### `bun run lint` passes now, and it was never just formatting

RUNBOOK §8.5 called these "pre-existing errors unrelated to the pipeline",
and an early read of this session called them fixable formatting. Both were
wrong. There were 7 errors and none were cosmetic:

* **`globals.css`** had two `@import` rules AFTER a `@keyframes` block. CSS
  ignores an `@import` that follows a non-import rule, so
  `tw-animate-css` and `shadcn/tailwind.css` were invalid where they sat.
* **`landing-page.tsx`** keyed a deliberately duplicated marquee list on the
  array index, and put `aria-label` on a bare `div` — whose `generic` role
  does not support it, so the label was being dropped entirely.
* Three files were simply unformatted.

The marquee now builds a pre-keyed loop at module scope (`first-`/`second-`
prefixes), so no index is needed and no suppression comment either — a
suppression was tried first and does not work there, because Biome anchors
the diagnostic to the `key` attribute and a `//` comment cannot sit between
JSX attributes. The workflow steps became an `<ol>` with `<li>` children,
which is the correct element for "three intelligent passes" and supports the
label; verified in the browser that it renders identically
(`list-style: none`, `padding-left: 0`, `margin: 0` from preflight).

57 `useSortedClasses` warnings are left deliberately: the autofix is
classified UNSAFE because reordering can change which of two conflicting
Tailwind utilities wins, and bulk-applying it across ~20 files without
screenshots is not a trade worth making. Warnings do not fail the lint.

**A process note worth keeping.** Running `biome check --write` on a file
that is syntactically invalid corrupted an unrelated line in it
(`href={appHref}` became `href=appHrefclassName=`). The file had to be
restored from git and the edits redone. Do not run the formatter as a way of
checking whether a mid-edit file parses.

## PWA + TWA instead of React Native (2026-09-03) — DEPLOYED

**Decision: make the existing Next.js frontend installable as a PWA and wrap
it as a Trusted Web Activity, rather than build a React Native client.**

### The measurement that settled it

A React Native client shares no rendering code with this app — every screen
would be rewritten — and can only reuse the renderer-free modules.
Re-measured today with `wc -l`:

```
src/**/*.tsx                        13,942 lines   <- rewritten by an RN client
  of which vendored components/ui/   3,621 lines
renderer-free shared logic           1,877 lines   <- all an RN client could reuse
  (src/lib/query/*, schemas.ts, media/sources.ts, runs.ts,
   run-status.ts, providers.ts, provider-icons.ts, provider-styles.ts)
```

So ~88% of the UI investment would be thrown away to reach a share sheet. A
PWA reuses 100% of it, and the TWA wrapper that provides the share sheet is
~1.8MB of generated Java containing no product logic.

The original brief quoted 13,338 / 1,462 for the same measurement; the
numbers above are the same command re-run on a repo that has grown since.

### Why a TWA and not a WebView

A TWA **is** Chrome. Consequences that removed most of the expected work:

- **Auth needed no changes at all.** better-auth cookie sessions work as-is,
  and Google OAuth is permitted — Google blocks embedded WebViews, not TWAs.
  No bearer plugin, no token store, no second auth path.
- Chrome **no longer requires a service worker for installability**.
  Verified before writing one: `Page.getInstallabilityErrors` returned an
  empty array and `beforeinstallprompt` fired with platforms `["web"]` with
  no service worker registered at all.

### Verified on production (relay.k79.quest)

```
Page.getAppManifest           errors: []
Page.getInstallabilityErrors  {"installabilityErrors":[]}
beforeinstallprompt           {"platforms":["web"]}
service worker                activated, scope https://relay.k79.quest/
Cache Storage                 precache 2, runtime 26, apiEntries 0
Digital Asset Links           {"linked": true}
signed AAB                    1,987,614 B, jar verified, SHA256 matches keystore
```

### Dead ends and traps, so they are not re-hit

- **`MetadataRoute.Manifest` DOES type `share_target`** in Next 16.2.6
  (`next/dist/lib/metadata/types/manifest-types.d.ts:52`). No cast and no
  type widening needed — check before reaching for a cast.
- **A worker compiled from `src/lib` cannot control the origin root.**
  Turbopack serves it from `/_next/static/service-worker/`, and a worker's
  scope is its own directory unless the server sends
  `Service-Worker-Allowed: /`. Hence `public/sw.js`.
- **Cache-first keyed on the `immutable` response header, not a path
  prefix.** That is what makes the worker inert under `next dev` without
  reading `NODE_ENV`, which RULES.md forbids outside `src/config`.
- **`cacheFirst` must read across BOTH caches.** Reading only the runtime
  cache left the offline page's precached icon broken — found from a
  screenshot, invisible in the code.
- **An empty share showed Zod's internals.** `issues[0]` on an empty URL is
  the `.min(1)` message "Too small: expected string to have >=1
  characters". Select the refine by `code === "custom"` — it owns the
  supported-sources sentence. `new-run-dialog.tsx:49` still has this bug
  for an empty input.
- **CDP offline emulation does not reach the worker's fetch context.** The
  offline fallback silently "passed" until the server was actually stopped.
- **A new `public/` file needs a rebuild.** Next computes its static-file
  manifest at build time, so `/share` and later
  `/.well-known/assetlinks.json` both returned 307 to `/login` via
  `(dashboard)/[...catchAll]` until rebuilt. The catch-all is not at fault
  and must not be "fixed".
- **Bubblewrap: the version key is `appVersion`.** `appVersionName` is
  silently ignored and yields an empty `versionName`, which Play rejects.
  Omitting `splashScreenFadeOutDuration` emits a bare
  `splashScreenFadeOutDuration: ,` into build.gradle — a Gradle syntax
  error.
- **`bubblewrap update` fetches `webManifestUrl` and parses it as JSON**, so
  it cannot run against a domain that has not been deployed yet; the error
  is an "Unexpected token" complaint about a DOCTYPE, which is the app's
  HTML 404 page.
- **`gradlew.bat` "is not recognized"** on Windows because
  `NoDefaultCurrentDirectoryInExePath=1`. Put the project dir on `PATH`.
- **Digital Asset Links direction:** the **web site is the source** and the
  app is the target. Querying with an `android_app` source returns a bare
  `maxAge` with no `linked` field, which reads as a failure and is really a
  malformed question.
- **`git stash` in this repo rewrites tracked files to CRLF** and Biome's
  formatter then rejects them. Avoid it.

### Share flow decisions

- **`share_target` uses method GET**, so the share arrives as ordinary query
  params a page reads from `searchParams` — no route handler and no redirect
  hop. POST with multipart is only needed to receive files.
- **`/share` is not session-gated.** `requireSession()` would bounce a
  signed-out user to `/login` and the link would be gone. The page renders
  for anyone; the client stashes the link in `localStorage` before asking
  about auth, and resumes after sign-in. localStorage rather than
  sessionStorage, because Google sign-in leaves the origin entirely and can
  come back in a different tab context.
- **Android share sheets put the URL in `text`, usually wrapped in prose.**
  All three params are swept and the first *supported* link wins, so
  "Look at this <tracker> <reel>" still works.
- **Validation and rejection copy both come from the shared `parseSourceUrl`
  and `relayProcessSchema`**, so the share sheet and the New run dialog can
  never tell the user two different things about the same link.
- **`share_auto_run`, default OFF** — human decision 2026-09-03. A share is
  one mis-tap away in any app, and running on arrival costs a real download
  and a real LLM call. Off, `/share` shows the link and waits for "Run it".
- **An already-processed URL is never auto-run again.** The page looks up
  the newest run for the canonical URL on every render and offers "View
  that run" / "Run it again". This is what fixes the duplicate-run bug from
  navigating BACK to `/share`: the `submitted` ref resets on remount, so a
  client-side guard alone could not hold. Matching on the canonical URL
  means `/shorts/<id>`, `youtu.be/<id>` and a link with tracking params all
  collapse to the same row.

### Not built, deliberately

No web push, no analytics, no offline write queue, no background sync, no
biometric lock. Relay's data is per-user and server-authoritative; queueing
writes in a worker would invent a second source of truth.

## Auth guard moved to Hono middleware (2026-09-03) — DONE

All 22 module routes carried the identical two-line `getRequestSession` plus
401 guard. Measured before touching anything: 7 modules, 22 routes, **zero**
exceptions — even the OAuth callback guards.

`src/server/require-session.ts` exports two variants, and that distinction
is the reason a single middleware would have broken production:
`requireSession` returns 401 JSON, and `requireSessionOrRedirect` returns a
302 to `/login` for the Ray OAuth start and callback, which the browser
NAVIGATES to — a 401 body would render as raw JSON in the address bar.

Applied per module (`module.use("*", ...)`) rather than by path in
`route.ts`, because a module carrying its own guard is fail-CLOSED: a route
added to it later is protected by default. Matching paths centrally is
fail-open — mount a module, forget the `use()`, and it ships
unauthenticated.

Side benefit: the `rays.ts` `/:provider` handler existed as a
`getRequestSession(...).then(...)` chain purely to await the session. With
the middleware it collapsed to a plain synchronous handler.

Verified endpoint by endpoint rather than trusted to the types:

```
                                       NO-COOKIE   WITH-COOKIE
GET  /credentials                      401         200
GET  /agents                           401         200
GET  /prompts                          401         200
GET  /runs                             401         200
GET  /settings/extraction-order        401         200
GET  /settings/share-auto-run          401         200
POST /relay/process                    401         202
POST /social/notaprovider/import       401         404
GET  /rays/oauth/notion                302 /login  302 api.notion.com/...
GET  /health                           200         200   (public, unchanged)
POST /telemetry                        200         200   (public, unchanged)
```

## YouTube media fetch broke mid-session (2026-09-03) — OPEN, NOT CAUSED BY THIS WORK

While verifying the share target on production, every YouTube run started
failing at the media fetch with "no client offered a downloadable audio
format" — the exhausted-fallback-chain message. Instagram continued to
reach `done`, so the pipeline itself is healthy.

```
10:28-11:46  done    youtube.com/shorts/...  x6 (incl. I4OkD3G11fw, 4yrAeQzavCM)
14:16:37     done    instagram.com/reel/...      <- pipeline healthy
14:18:09     failed  youtube.com/shorts/v6-3TBOTTak
14:18:50     failed  youtube.com/shorts/1FP7PFamTxc  <- succeeded EARLIER TODAY
```

The control is the decisive part: `1FP7PFamTxc` reached `done` earlier the
same day and now fails. The `/shorts/` canonical form was deliberately left
byte-identical by the source-registry change, so this is not that change.
YouTube is the only `proxied: true` source, which points at the WARP egress
sidecar or another YouTube-side client shift — the failure class RUNBOOK §3
and the Dockerfile's `yt-dlp` pin comments already document. Next step is
RUNBOOK §4 triage, starting with whether the warp container is up.

## YouTube outage diagnosed: it is the server, not the links (2026-09-03) — FIXED, CAUSE NARROWED

Supersedes the "OPEN, NOT CAUSED BY THIS WORK" entry above.

### The A/B that settled "genuine or server"

Local yt-dlp is **2026.08.19, identical to the Dockerfile pin**, so this was
a single-variable test: same binary, same `-f bestaudio/best`, no proxy, no
cookies, residential connection.

```
OK  eakngayy0V0   1,159,429 B   <- prod: failed
OK  7yx9iQ1ODQo   2,958,793 B   <- prod: failed
OK  9n52TUOcSC0   3,433,877 B   <- prod: failed
OK  1FP7PFamTxc   1,088,066 B   <- prod: failed (succeeded in prod at 11:46)
OK  I4OkD3G11fw   1,996,902 B   <- prod: succeeded 10:28
OK  5RYVYa1v-O0   2,500,405 B   <- prod: succeeded 11:46
```

`I4OkD3G11fw` came back **byte-identical** to the 1996902B recorded in the
Dockerfile's yt-dlp pin comment, which is what confirms the local run is
equivalent to the known-good prod baseline rather than merely "working".

METHOD NOTE, because it nearly produced a false report: `ls source.*` matches
`source.info.json` before `source.webm`, so the first pass printed metadata
sizes as if they were media. Always assert on the media file.

### What prod actually said

From the live run log stream via `GET /runs/:id/logs` (`additional_data` keeps
only error_code/failed_stage/permanent — the per-attempt stderr is only in
the log stream):

```
Download starting  {proxied=true}
default        -> ERROR: The page needs to be reloaded.
web_safari     -> ERROR: Requested format is not available
web_embedded   -> ERROR: Requested format is not available
mweb           -> ERROR: Requested format is not available
Every player client failed
```

NOT bot-check, NOT 403, NOT proxy-unreachable — so the WARP tunnel is up and
carrying traffic, and YouTube is answering with a degraded player response.
"The sidecar is down" is ruled out.

### Two candidate causes, not separated by evidence alone

Same jar, same proxy, same binary produced **6 successes 10:28-11:46** and
**7 failures from 14:18**. The `youtube/cookie` credential's `updated_at` is
`11:46:43` — exactly the last success — and write-back is success-gated, so
the stored jar is the last known-good one and was not corrupted by the
failures. All 13 runs belong to one user, who holds that jar.

- **A — the WARP exit address is now soft-refused.** A degraded player
  response instead of a bot page.
- **B — Google invalidated that session after 11:46**, plausibly because it
  was being used from a foreign datacenter IP. RUNBOOK standing risk 4
  predicted exactly this and called it unknown.

Both produce "no formats" when signed in, which is what the BOT_CHECK
docstring already documents as the signed-in symptom.

### Three defects found, all fixed

1. **`web_safari` was dead and led the fallback chain.** It fails from a
   RESIDENTIAL connection too — 3 of 4 real Shorts:

   ```
   ID             default   web_safari   web_embedded   mweb
   eakngayy0V0    OK        FAIL         OK             OK
   7yx9iQ1ODQo    OK        FAIL         OK             OK
   9n52TUOcSC0    OK        OK           OK             OK
   1FP7PFamTxc    OK        FAIL         OK             OK
   ```

   It led the list because "its HLS formats need no PO token"; that property
   is gone. Default is now `web_embedded,mweb`. `YT_DLP_YOUTUBE_CLIENTS` was
   NOT set in Coolify, so the code default is what production runs — this
   ships with the deploy and needs no Coolify change.

2. **The chain never tried anonymous.** `cookiesPath` was passed to every
   attempt, so a jar YouTube has stopped honouring failed all of them
   identically — with no fallback, taking down all YouTube ingestion.
   Anonymous is sufficient for a PUBLIC item and is exactly what works.
   `download.ts` now retries once with no jar, on the DEFAULT client, after
   every signed-in client has failed a client-shaped failure.

3. **The verdict blamed the source, and never retried.** These runs stored
   `SOURCE_UNAVAILABLE` + `permanent: true`, and told the user "This is a
   source or extractor problem, not your session" — wrong under BOTH
   candidate causes. New `egress-degraded` rung, ranked above
   `format-missing`: the per-attempt flags ARE the diagnosis, because
   `proxied && !withCookies && FORMAT_MISSING` means "through our proxy,
   anonymously, still no formats", and anonymous+residential demonstrably
   works. It emits `DOWNLOAD_FAILED`, which is already retryable, rather
   than editing the permanent list — that would have made genuinely dead
   videos retry too.

### The fix is also the experiment

Shipping the anonymous rung separates A from B without deleting the user's
credential: the next failing YouTube run retries anonymously through WARP,
and either succeeds (cause B, the jar) or fails with the new
`egress-degraded` verdict (cause A, the exit IP).

### How it was tested

`src/lib/media/**` is the pipeline, so it was not shipped on a read. A
`.bat` yt-dlp stub (failing when `--cookies` is present, succeeding
otherwise) exercised `download()` end to end without touching real
credentials or the network:

```
TEST 1  jar fails every client, anonymous works -> download recovered
TEST 2  jar AND anonymous fail  -> egress-degraded, DOWNLOAD_FAILED, permanent=false
TEST 3  no jar at all, anon fails -> same verdict
```

Plus a 10-case regression over the whole ladder, because a rung was inserted
into a load-bearing order. The two that matter: a `403` followed by a
format-miss still resolves to `client-refused` (the new rung cannot hijack a
better diagnosis), and a format-miss that is anonymous but NOT proxied still
resolves to `format-missing` (local dev and Instagram unchanged).

STUB GOTCHAS, both of which produced fake passes first: batch cannot parse
`for %%A in (%*)` when an argument contains `%(ext)s` — use a `shift` loop —
and Bun's shell rejects `%(` written literally in a template, so arguments
must be passed as an ARRAY exactly as `runYtDlp` does.

### CORRECTION (same day): it was cause B, the jar — and anonymous now goes FIRST

The entry above narrowed the outage to two causes and then, on seeing a
retry succeed, called cause A (a transient egress condition). **That was
wrong.** The variable that changed was not time — the YouTube cookie
credential had been DELETED between the failures and the retry.

```
credentials now:  gemini, groq, instagram/cookie, notion x3,
                  ollama-cloud, openrouter        <- no youtube row
```

Which makes the timeline a clean experiment:

| when | jar | result |
|---|---|---|
| 10:28-11:46 | signed-in | 6 x done |
| 14:18-15:17 | signed-in | 7 x failed ("no formats" / "page needs to be reloaded") |
| after removal | anonymous | 4 x done |

And the post-removal byte counts equal the residential downloads exactly —
eakngayy0V0 1159429, 7yx9iQ1ODQo 2958793, 9n52TUOcSC0 3433877,
1FP7PFamTxc 1088066. Both post-removal runs show a single
`client=default proxied=true` attempt succeeding, and the failed one
carried the `!withCookies` message variant, confirming no jar was sent.

**The jar had gone bad; the proxy was innocent all along** — the four
successes went through it. RUNBOOK standing risk 4 (a live Google session
used from a foreign datacenter IP getting flagged) is no longer
hypothetical.

LESSON: a "the retry worked, so it was transient" conclusion is only valid
if nothing else changed. Check the inputs before crediting time.

### Anonymous FIRST for YouTube — human decision 2026-09-03

`publicAnonymously` on the source registry (YouTube only). When set and a
jar exists, the session order is **anonymous, then the jar**; the jar is
only spent on an item that actually needs one. Two reasons:

1. It removes the root cause. The jar no longer traverses the WARP exit on
   every run, which is what appears to have got it flagged.
2. It cannot be taken down by one dead session, which is exactly what
   happened.

Instagram deliberately gets NO anonymous attempt: it cannot reach Reels
without a jar at all (SESSION_AUTH.md 1.2), so anonymous is pure waste —
and keeping the jar attempt FIRST is what preserves `SESSION_EXPIRED`
detection, because equal-ranked attempts keep the earliest and only a jar
attempt can resolve to that code.

The second session is attempted when the first failed something a
different session could plausibly change: `CLIENT_RETRYABLE` **or** the
`UNAVAILABLE` family. The latter was added deliberately — "not available"
is exactly what a signed-in fetch answers for a private or age-restricted
item, and what a bad jar reports for a public one.

Measured with a yt-dlp stub that logs whether each invocation carried
`--cookies`, so the ORDER and COUNT are asserted, not the outcome alone:

```
YOUTUBE (publicAnonymously, jar present)
  anon works                       DOWNLOADED         calls=[anon]
  anon unavailable, jar works      DOWNLOADED         calls=[anon,cookies]
  both fail (format)               DOWNLOAD_FAILED    calls=[anon x3, cookies x3]
  both fail (unavailable)          SOURCE_UNAVAILABLE calls=[anon,cookies]
YOUTUBE, no jar
  anon only                        DOWNLOAD_FAILED    calls=[anon x3]
INSTAGRAM (jar present)
  jar first, no anon attempt       SESSION_EXPIRED    calls=[cookies]
  jar works                        DOWNLOADED         calls=[cookies]
```

`anon x3` is the default client plus the two remaining fallbacks, so the
client chain still runs in full per session; "unavailable" is not
`CLIENT_RETRYABLE`, which is why those cases stop at one call per session.

### Still open

`R070nqMY-ZE` fails through the proxy with "This video is not available"
while downloading fine (759651 B) from residential. With no jar stored
there is no second session to try, so it still resolves to
`SOURCE_UNAVAILABLE` — permanent, and phrased as though the video were
gone. Most likely geo: WARP exits in another country. One data point.

## Multiple accounts per provider, with fallback (2026-09-03)

`createCredential` deleted every existing `api_key` row for the provider
before inserting, so a second key REPLACED the first. That was a
deliberate one-per-provider rule; it is gone. Replacement now keys on the
account only (`meta_data.account_id`, or an explicit `replacesId` for a
cookie jar that carries no id), which is what the Ray path already did.

Two orthogonal concepts, both surfaced on `MaskedCredential`:

- **`active`** — a real column (`credentials.is_active`, migration 0007).
  Off means every pipeline read path skips it. Chosen over a settings flag
  because `agents.is_active` is the same idea and it becomes a WHERE
  clause instead of a second lookup.
- **`selected`** — `user_settings.credential_selection`, a
  `{ [provider]: credentialId }` map. Deliberately NOT a column: a
  "one row is primary" invariant has to be maintained on every insert and
  delete, whereas a map that names a missing or switched-off row simply
  reconciles to the oldest active one, the same way
  `resolveExtractionOrder` reconciles a stale provider order.

`orderForProvider` (src/lib/vault-select.ts) is the single definition of
the order — selected first, then oldest-first — and every reader goes
through it, so the UI's badges and the pipeline's chain cannot disagree.
Single-credential readers (`getAccessToken`, `getSecretByType`, the Notion
Ray) take the head; readers that can retry walk the whole chain.

### What makes a second account a fallback

`disposition` (src/lib/extraction/chat-failures.ts, split out of chat.ts
for the 250-line cap) gained `next-credential`. 401/403 and account-wide
402 were `next-provider` — a dead or spent key abandoned the provider
outright even when another account was sitting right behind it. 429 stays
`next-model`, and when the models run out the loop falls through to the
next credential by itself, which is the rate-limit case. Only 413 still
abandons the provider: a size limit is the provider's, not the account's.

Transcription had no fallback of any kind — one provider, one key, and any
failure propagated. `runWhisperPair` (src/lib/transcription/resolve.ts)
walks providers x keys, but only on 401/403/402/429. A 5xx or a timeout
does NOT fall through: re-uploading the audio to work around a transient
fault costs more than it saves.

The model catalog stamp is the NEWEST `updated_at` across the provider's
active credentials, not the selected one's. The cache row is keyed
(user, provider), so a per-key stamp would make every fallback invalidate
the snapshot the next run needs.

### Verified

Against a throwaway local sqlite, not the live Turso:

```
three keys, oldest first        chain: A -> B -> C
pinned the third                chain: C -> A -> B
switched the first off          chain: C -> B
switched it back on             chain: A -> B -> C   (re-enabling pins it)
all off                         chain: (empty), getAccessToken -> null
deleted the pinned key          falls back to the survivor
```

Through the browser on a scratch database: two Gemini keys with different
account names coexist, the pin moves which one is first, and Settings ->
Extraction priority still lists Gemini once rather than once per key.

### Still open

Migration 0007 is NOT applied to the live Turso database. Until it is,
`is_active` does not exist and the vault renders every row as switched
off. `bun run db:migrate`.
