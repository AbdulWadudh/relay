# Relay production runbook

**What keeps this product running, what broke, and what to check first.**

Written 2026-09-03, at the end of the session that took YouTube from
totally broken in production to working end to end. Everything here was
measured on the production host, not inferred. Where a number appears, the
command that produced it is nearby.

Read §1 if something is broken right now. Read §2–§4 to understand why the
system is shaped the way it is.

---

## 1. Triage — something is broken

Work down this list. Each step is cheap and rules out a whole class.

### 1.1 Is everything up?

```bash
ssh -i ~/.ssh/k79_secondary ubuntu@144.24.126.27
sudo docker ps --format "{{.Names}} | {{.Status}}"
```

Four things must be healthy:

| container | role | if it is down |
| --- | --- | --- |
| `relay-…` | Next.js web app, runs `db:migrate` on start | no UI, no API |
| `worker-…` | BullMQ worker — **this runs the whole pipeline** | runs sit in `queued` forever |
| `dragonfly-…` | queue backend + live run logs | nothing is picked up |
| `vbub6kov…` | **WARP egress** (`warp-egress`) | every YouTube run fails |

### 1.2 Is the egress reachable?

The single most likely cause of "all YouTube runs suddenly fail".

```bash
sudo docker exec $(sudo docker ps -qf name=worker-djtrhq) getent hosts warp
# expect: 10.0.8.x  warp
```

**If that resolves nothing, this is almost certainly it** — see §3.2. The
fix is one command and it is needed after every `warp-egress` deploy.

### 1.3 Read the run's own logs

The run detail page has a collapsible log stream under each pipeline stage.
Expand **Downloading**; it carries yt-dlp's own output. This is usually
faster than anything below.

Two limits to know before you trust an empty panel:

- The live window lives in Dragonfly with a 24h TTL, and **a deploy
  restarts Dragonfly**, so logs from before the last deploy are gone.
- Older runs fall back to OpenObserve, which only has `info` and above —
  so the yt-dlp `debug` lines will be missing from history.

### 1.4 Match the error message

| message | what it means | go to |
| --- | --- | --- |
| "outbound proxy is unavailable" | our egress is down | §1.2, §3.2 |
| "challenging this server as automated traffic" | traffic went **direct** — the proxy was not used | check `MEDIA_PROXY_URL` is set; §3.1 |
| "no client offered a downloadable audio format" | **usually a stale yt-dlp**, not a format problem | §2.1 |
| "the source refused every available client (HTTP 403)" | GVS refusal | §2.1 first, then §2.2 |
| "Your … session has expired" | a supplied cookie jar was rejected | Vault; only ever fires when a jar was actually sent |
| run stuck on `queued` | worker down, or enqueue failed | §1.1 |

### 1.5 The one diagnostic that beats all others

```bash
# On the pinned version, then on the latest release:
yt-dlp -f bestaudio/best -o t.%(ext)s "<url>"
```

If the latest release works and the pin does not, **stop diagnosing and
bump the pin**. This exact check would have saved most of a day — see
§2.1.

---

## 2. What was broken, and what actually fixed it

### 2.1 A stale yt-dlp — the real outage

**Symptom.** Roughly half of YouTube items failed. Metadata resolved, then
the CDN refused the stream with `403`. Users saw "no client offered a
downloadable audio format", which blamed the extractor and was misleading.

**Cause.** The pin was `2026.03.17`, about six months old. YouTube changes
its streaming layer continuously.

**Fix.** Bumped to `2026.08.19`. A/B on one connection, same format
selector, minutes apart:

| video | `2026.03.17` | `2026.08.19` |
| --- | --- | --- |
| `I4OkD3G11fw` | FAIL | **OK** 1,996,902 B |
| `4yrAeQzavCM` | FAIL | **OK** 2,238,320 B |
| `LiH-P4rSkLI` | FAIL | **OK** 1,141,287 B |
| `5mU6SRS2Bxo` | OK | OK, byte-identical |

`bun run verify:ytdlp` then passed all six fixtures **on the default
client**, and reported the fallback chain as "never needed or never
worked".

**Why it took so long to find, recorded so it does not repeat.** Those
403s reproduced from a residential connection too. That was read as "not
network-specific, therefore source-side, therefore unfixable" — which
conflated *a problem at the source* with *a bug in our own tool*. A
residential control correctly rules out the proxy. It says nothing about
whether the tool is current.

> **Rule: when a 403 is widespread, A/B the yt-dlp version FIRST.** It is
> one download and it is decisive. Then run the residential control.

Four music videos (`dQw4w9WgXcQ`, `kJQP7kiw5Fk`, `9bZkp7q19f0`,
`n5t23nvU_t0`) were written up as permanently broken on this reasoning.
All four download fine on the new pin.

**Cadence.** yt-dlp warns once a build is over 90 days old. Treat that
warning as the trigger. Always run `bun run verify:ytdlp` against the
candidate before changing `YT_DLP_VERSION` in the `Dockerfile`.

### 2.2 The production IP is bot-checked — fixed by an egress proxy

**Symptom.** Signed out, every YouTube client returned "Sign in to confirm
you're not a bot". Signed in, every client returned "Requested format is
not available".

**Cause.** YouTube refuses **datacenter** addresses. This deploy is an
Oracle VPS, which is nothing but a datacenter address. Not a per-IP
reputation ban — an ASN category.

**Fix.** Route YouTube through Cloudflare WARP. Measured on 12 real Shorts
with the pinned yt-dlp and our own format selector, minutes apart:

| egress | result |
| --- | --- |
| direct from the VPS | **0 / 12** |
| through the WARP proxy | **11 / 12** |
| a residential connection | **11 / 12**, byte-identical |

The 12th (`LiH-P4rSkLI`) failed on the old pin everywhere and works on the
new one. So proxied production now matches residential.

**This closes the gap to residential; it does not beat it.** Nothing
should be read as claiming otherwise.

Full detail, including the manual network step, is in
[EGRESS_PROXY.md](EGRESS_PROXY.md).

### 2.3 Things that were tried and did NOT work

Recorded so nobody spends the time again.

| approach | verdict | evidence |
| --- | --- | --- |
| **`@hoangquyet/ytdown` as primary downloader** | Abandoned | Bot-checked from the prod IP on 8 of 9 videos. `YTW_SESSION` is never consulted — the player call throws first (`downloader.js:649`). **No proxy support of any kind** (`src/net/http.js` hardcodes `node:https` agents), so no lever that fixes this can be aimed at it. |
| **PO tokens (`bgutil`)** | Works, buys nothing | The provider ran, the plugin loaded, it minted a real GVS token. Downloads went 5/9 with it and 5/9 without: on the default client yt-dlp never *requests* one. Re-tested against a genuine GVS 403 and it still made no difference — those turned out to be §2.1. |
| **Download video, extract audio** | Does not apply | The whole media fetch was refused, not just the audio stream. `-f 18` (muxed, has audio) also 403'd, and `bv*+ba/b` produced a 51 MB **video-only** file with no audio track. There was no video to extract from. |
| **`wgcf` + `wireproxy`** | Works, rejected | 11/12, identical bytes — but `pufferffish/wireproxy` now redirects to `windtf/wireproxy`. The repository changed hands and publishes prebuilt binaries. Not a supply chain for a production egress. Ships Cloudflare's official `warp-svc` instead. |
| **Free proxy pool (proxyscrape)** | Works, rejected | 1888 raw → 484 tunnelling TLS → 34/60 clearing the bot check → 32/34 still alive 20 min later. Latency 12–114 s vs WARP's 2–3 s, needs refresh/health-scoring/retry logic, and many open proxies are misconfigured or compromised machines whose owners did not consent. **Keep as the fallback if WARP is ever blocked.** |
| **Putting the app on the `coolify` network** | Rejected, security | It would have made warp reachable in one click. That network has 7 other containers and **Dragonfly runs with an empty `requirepass`** — it would expose the unauthenticated job queue to every other app on the box. Attach warp *inward* instead. |

---

## 3. What keeps it running

### 3.1 The egress path

```
worker container ──socks5://warp:1080──> warp-egress ──WireGuard──> Cloudflare ──> YouTube
   (app network)                        (Coolify resource)
```

| piece | where |
| --- | --- |
| `MEDIA_PROXY_URL` | Coolify env var on `relay:main` = `socks5://warp:1080` |
| the proxy | Coolify resource `warp-egress`, `caomingjun/warp:2026.7.1377.0-2.12.0` |
| which sources use it | `proxied` flag in `src/lib/media/sources.ts` |
| where it is applied | `src/lib/media/download.ts`, `--proxy` |

**Only YouTube is proxied.** Instagram has no `proxied` flag and goes
direct — verified by configuring a dead proxy and watching an Instagram URL
fail for its own reason without touching it. That is deliberate: Instagram
works direct and authenticates with the user's own cookie jar, so putting a
third party in that path would add risk for nothing.

**No authentication is required.** Free WARP self-enrols;
`WARP_LICENSE_KEY` is empty and the container generated its own device
identity (`Account type: Free`). **This feature introduced no new secret.**
If the exit is ever blocked, delete `/var/lib/cloudflare-warp/` in that
container and restart — it re-enrols anonymously with a fresh address.

**Rollback:** set `MEDIA_PROXY_URL` to empty and redeploy. No code revert;
`download.ts` omits `--proxy` when it is empty.

### 3.2 THE MANUAL STEP

Coolify puts a standalone resource on the shared `coolify` network, while
the app is on `djtrhq2qxxyt1doyonjctwcb`. **They cannot see each other**,
and `--network` in *Custom Docker Run Options* is **silently stripped** by
Coolify — this was tried and does not work.

So after **every deploy or restart of `warp-egress`**:

```bash
C=$(sudo docker ps --format '{{.Names}}' | grep vbub6kovmw5g2symo9hswzba)
sudo docker network connect --alias warp djtrhq2qxxyt1doyonjctwcb "$C"
```

Deploying `relay:main` does **not** need this. Only `warp-egress` being
recreated does.

**The durable alternative** is to move `warp` back to a service in
`docker-compose.yml`, where Compose puts it on the app network
automatically with the `warp` alias and the config lives in git. That is
how it was originally built; it became a separate resource by preference.
If this step ever bites, that is the fix.

### 3.3 Error classification

`src/lib/media/download.ts` maps failures onto a ladder, and the ORDER is
load-bearing. Each ordering exists because the wrong one shipped a lie:

| tested | pattern | resolves to | why it is where it is |
| --- | --- | --- | --- |
| 1st | `PROXY_UNREACHABLE` | `DOWNLOAD_FAILED` (retryable) | The SOCKS layer reports a refused tunnel as a `403` in some yt-dlp versions. Read as `CLIENT_REFUSED` it classifies **permanent**, so a few seconds of sidecar restart would fail every overlapping run for good. |
| 2nd | `CLIENT_REFUSED` (403) | `SOURCE_UNAVAILABLE` | Means the same with or without a jar, so it must never read as an expired session. |
| 3rd | `BOT_CHECK` | `SOURCE_UNAVAILABLE` | A jar cannot answer a challenge aimed at the server's address. Counting it against the credential would retire a working session. |
| 4th | `FORMAT_MISSING` | `SOURCE_UNAVAILABLE` | Its text contains "not available", so without this it falls into the login-shaped branch and — with a jar present — reports as an expired session. |
| 5th | `UNAVAILABLE` | `SESSION_EXPIRED` **only if a jar was sent**, else `SOURCE_UNAVAILABLE` | The one case that genuinely means "your session died". |

**Known weakness, not yet fixed.** Classification uses the **last**
attempt's stderr. When the default client 403s and the fallbacks then
report "no formats", the informative 403 is discarded — which is exactly
how §2.1 produced a misleading message. Worth fixing: prefer the most
informative attempt.

### 3.4 The fallback client chain

`YT_DLP_YOUTUBE_CLIENTS` = `web_safari,web_embedded,mweb`, tried in order
after the default client on a client-shaped failure.

On the current pin it is **never needed** — every fixture succeeds on the
default client. **Do not delete it.** Which clients YouTube serves is a
moving target, and this is what absorbs the next shift. It costs nothing
when nothing fails.

### 3.5 Secrets discipline

- **`MEDIA_PROXY_URL` is treated as a credential.** It may legitimately be
  `socks5://user:pass@host`, yt-dlp echoes the proxy it was handed when it
  cannot reach it, and that stderr is stored on the run and shown to the
  user. `scrubProxy` strips it at the single point stderr enters the
  program, not at each point it leaves.
- **`proxy` is in the logger's redaction words; `proxied` is not** — the
  boolean the download step logs is the useful half of the diagnostic
  without the half that can hold a secret.
- **`bun run verify:proxy`** puts a canary password through five real
  yt-dlp failure shapes and a log record. 8 paths, expected 0 leaks. Run it
  after touching `scrubProxy`, the redaction list, or pointing
  `MEDIA_PROXY_URL` at an authenticated proxy.
- **Never add `--no-check-certificates`.** With TLS through the tunnel the
  operator sees only opaque traffic while validation is on. That one flag
  is what turns this from safe into credential-leaking.
- **Never give `warp-egress` a domain.** Coolify auto-assigned one from the
  server wildcard at creation; it was removed before it served traffic.
  `gost -L :1080` auto-detects HTTP as well as SOCKS5, so a public route
  would be a usable **open proxy**.

### 3.6 Run logs

Live lines are in Dragonfly (capped at `RUN_LOG_MAX_LINES`, 24h TTL);
anything older is read back out of OpenObserve. Neither needed a schema
migration, which is the whole reason for the split.

Capture is a pino `mixin` plus an `AsyncLocalStorage` run context, so every
`logger.*` call is attributed to a run **and** a stage without any call
site knowing a run exists.

Three traps found while building it, all still true:

1. **Redaction.** `redactLogValue` was applied only to HTTP trace bodies;
   `logger.*` calls reached pino unredacted. Fine while logs went to
   stdout, **not** fine once they are rendered in the product. Redaction
   now runs in the tee.
2. **`pino.multistream` filters each stream at `info`** unless given a
   level, so every `logger.debug` in the codebase was being discarded.
   `debug` is enabled on the run-log stream only.
3. **Run logs need their own Redis client.** The shared `getRedis()` sets
   `enableOfflineQueue: false` so an enqueue fails loudly — correct for a
   job, wrong for a log line. The first append after a process start
   arrives before the socket is ready and threw "Stream isn't writeable",
   silently dropping every line of the first run after a deploy.

---

## 4. Deploy

`relay:main` has `is_auto_deploy_enabled: true`. **Pushing to `main`
deploys.** Do not also trigger a deploy — the webhook can take longer than
90 s to show new containers, and checking too early then triggering
manually queues a redundant second build.

```bash
git push origin main          # this is the deploy
# then watch, do not trigger:
sudo docker ps --format "{{.Image}}" | grep _relay:
```

- Coolify rewrites service image tags to `<resource-uuid>_<service>:<sha>`,
  so the running tag tells you exactly which commit is live.
- Compose services keep their bare service name as a network alias, which
  is why `redis://dragonfly:6379` and `socks5://warp:1080` work.
- **A deploy restarts Dragonfly**, which wipes the live run-log window.
- A graph-only or docs-only commit still triggers a full rebuild.

### Where things live

| file | what it owns |
| --- | --- |
| `Dockerfile` | `YT_DLP_VERSION` pin, ffmpeg. **No Python, deliberately** |
| `docker-compose.yml` | `relay`, `worker`, `dragonfly`, and the shared env block |
| `src/lib/media/sources.ts` | source registry — hosts, URL patterns, `proxied` flag |
| `src/lib/media/download.ts` | yt-dlp invocation, the error ladder, `scrubProxy` |
| `src/config/index.ts` | every env var, with the reasoning |
| `src/lib/render/` | document tree → Notion blocks and row properties |
| `EGRESS_PROXY.md` | the proxy in full |
| `LLM_STATE.md` | chronological decision log |
| `SESSION_AUTH.md` | cookie jars, sessions, credential lifecycle |

---

## 5. Open risks

Ordered by how likely they are to bite.

1. **The manual network attach (§3.2).** Not durable. Redeploy
   `warp-egress` and YouTube stops until someone runs one command. The
   compose-service alternative removes this entirely.
2. **Free WARP is a CONSUMER product.** Using it as server-side egress is
   outside its intended use and Cloudflare may rate-limit or block it. The
   sanctioned paths are WARP Connector or a Zero Trust plan — both are a
   `MEDIA_PROXY_URL` change and no code change. This is a business
   decision, and it is the largest risk here.
3. **One shared exit.** If it is flagged, every YouTube run fails at once,
   where a proxy pool would degrade gradually.
4. **yt-dlp goes stale again.** It is the thing that broke production once
   already. Watch for the 90-day warning.
5. **The signed-in path is UNTESTED.** Anonymous is 11/12, so cookies are
   not needed for public Shorts and the Vault's "Connect YouTube" wizard is
   no longer load-bearing for basic function. What is untested is whether a
   signed-in jar is *accepted* from a WARP address, and whether routing a
   live Google session through a foreign consumer IP trips Google's
   account-security heuristics. Current behaviour sends the jar through the
   proxy when one exists. Test on an account you can afford to have
   challenged.
6. **`lint` is not clean on `main`.** Pre-existing errors in
   `src/app/**` and `runs-table-skeleton.tsx`, unrelated to this work.
   `bun run typecheck` IS clean; check per-file rather than trusting the
   whole-repo result.

---

## 6. How to be right about this system

The mistakes in this session had one shape: **a plausible explanation
accepted before the cheap decisive test.**

- 0/1888 proxies looked dead. The harness was broken — proxyscrape serves
  CRLF, so every proxy string was `http://ip:port\r` and curl rejected it
  before opening a socket. The tell was the uniform sub-5-second runtime.
- "6 of 8 downloads succeeded" was 8 attempts at **one** video. It
  measured proxy reliability and never per-video coverage.
- "Fails from residential too, therefore unfixable" was a stale yt-dlp.
- "itag 139 works" was one lucky success; it failed 30 seconds later.
- A `--list-formats` output read as "video-only formats" had been truncated
  with `tail -12`; the audio formats were there.

So:

> Run the control. Run it on more than one input. Say which host produced
> each number. And when a fix is one command away, run it before writing
> the theory.
