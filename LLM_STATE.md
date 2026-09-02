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

What it needs: a public host (the server has a `*.k79.quest` wildcard;
`relay.k79.quest` and `relay-db.k79.quest` are the existing pattern)
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
- **Coolify (app `djtrhq2qxxyt1doyonjctwcb`, env `relay`)**: added `REDIS_URL=redis://dragonfly:6379`, `QUEUE_CONCURRENCY/ATTEMPTS/BACKOFF_MS`, `FAVICON_SERVICE_URL`. `STUDIO_PASSWORD` was already set, so dropping the `DRIZZLE_MASTERPASS` fallback from compose is safe (that var held the literal error string — a Coolify artifact).
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
