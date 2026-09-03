# Egress proxy — YouTube from the production host

YouTube refuses **datacenter addresses**, and this deploy is a VPS. Every
YouTube download from production failed until its traffic was routed through
a non-datacenter egress. This document is how that works, how to operate it,
and what to check first when it breaks.

Instagram is unaffected and does not use the proxy.

---

## 1. The measurement this exists for

12 real Shorts, the pinned `yt-dlp 2026.03.17` from the app image, our own
`-f bestaudio/best`, the same client chain, minutes apart on 2026-09-03:

| egress | result |
| --- | --- |
| direct from the VPS | **0 / 12** — every one "Sign in to confirm you're not a bot" |
| through the WARP proxy | **11 / 12** — all on the DEFAULT client |
| a residential connection | **11 / 12** — byte-identical files |

The twelfth (`LiH-P4rSkLI`) returned 403 from a residential connection too
— on the yt-dlp pinned at the time. It downloads fine on `2026.08.19`; see
§1a. The table above was measured on the old pin, and the egress conclusion
is unaffected by the bump.

**This closes the gap to residential. It does not beat it.** Do not read any
number here as a claim that proxied production is better than a normal
connection — it is equal to one, which was the entire goal.

### 1a. The trap that cost an afternoon — and the wrong lesson drawn from it

Four long-form music videos (`dQw4w9WgXcQ`, `kJQP7kiw5Fk`, `9bZkp7q19f0`,
`n5t23nvU_t0`) returned 403 through the proxy. It looked exactly like a
proxy limitation. A residential control failed on the same four and
succeeded on the same five, byte-identical — so it was recorded as
source-side and unrelated to egress.

**That conclusion was wrong.** All four download fine on `2026.08.19`. The
403s were a STALE EXTRACTOR: metadata resolved, then the CDN refused the
stream, equally on every network. The same cause broke real Shorts in
production and produced the misleading "no client offered a downloadable
audio format".

Two rules, in this order:

> **1. A/B the yt-dlp version first** whenever a 403 is widespread. It is
> one download and it is decisive:
> `yt-dlp -f bestaudio/best -o t.%(ext)s <url>` on the pin, then on the
> latest release.
>
> **2. Then run the residential control.** It correctly rules out the
> proxy — but "fails everywhere" is NOT "unfixable". That step conflated a
> source-side problem with a bug in our own tool.

### PO tokens are not the answer — tested, not assumed

`bgutil-ytdlp-pot-provider` 1.3.2 was installed on the production host, the
plugin loaded as `bgutil:http-1.3.2`, and it minted a genuine token. It
changed **nothing**: 5/9 with it, 5/9 without. On the default client yt-dlp
never *requests* a GVS token, so there is no gate for one to open.

Do not reach for it again without first confirming the failure is a GVS 403
on a client that actually requires a token.

---

## 2. How it is wired

```
worker container  --socks5://warp:1080-->  warp        --WireGuard-->  Cloudflare
   (app network)                          (app network)                     |
                                                                            v
                                                                        YouTube
```

| piece | where it lives |
| --- | --- |
| `MEDIA_PROXY_URL` | Coolify env var on the app, value `socks5://warp:1080`. `docker-compose.yml` defaults to the same value, so the two cannot disagree by accident |
| the proxy itself | the **`warp` service** in `docker-compose.yml`, image `caomingjun/warp:2026.7.1377.0-2.12.0` |
| which sources use it | `proxied` flag in `src/lib/media/sources.ts` |
| the flag being applied | `src/lib/media/download.ts`, `--proxy` |

`warp` is a **service in `docker-compose.yml`** and deploys with the app. It
runs Cloudflare's official `warp-svc` daemon with `gost` exposing SOCKS5 on
1080, and it publishes **no port**: `gost -L :1080` auto-detects HTTP as well
as SOCKS5, so a published 1080 on a public VPS would be an open relay. Only
the app network can reach it.

It is deliberately **not** in the worker's `depends_on`. Only sources flagged
`proxied` use it, and gating the worker on a free-tier consumer tunnel would
stop Instagram ingestion every time WARP is throttled. A YouTube fetch with
the tunnel down fails `DOWNLOAD_FAILED`, which the queue retries.

### No authentication is required

Free WARP self-enrols. No Cloudflare account, no email, no license key —
`WARP_LICENSE_KEY` is empty and the container generated its own device
identity on first start (`Account type: Free`). **This feature introduces no
new secret**, which is why nothing was added to the vault.

The registration lives in the container's `/var/lib/cloudflare-warp/`. If the
exit address is ever blocked, delete it and restart: it re-enrols anonymously
with a fresh address. Nothing of yours is tied to it.

### 2a. Rotating the exit address

**A plain restart does NOT rotate it.** `warp_data` is a named volume
specifically so a restart keeps the address the measurements were taken on
(see the comment on the volume in `docker-compose.yml`). Bouncing the app
therefore costs downtime and changes nothing. Only dropping the registration
draws a new address.

In the container, which leaves the app running:

```bash
docker exec -it $(docker ps -qf name=warp) sh -c '
  warp-cli --accept-tos registration delete
  warp-cli --accept-tos registration new
  warp-cli --accept-tos connect
'
# then confirm the tunnel is up AND the address actually moved
docker exec $(docker ps -qf name=warp)   curl -s --socks5-hostname 127.0.0.1:1080 https://cloudflare.com/cdn-cgi/trace   | grep -E '^(warp|ip)='
```

Or by wiping the volume, which is the same thing with a container recycle:

```bash
docker compose stop warp
docker volume rm "$(docker volume ls -q | grep warp_data)"
docker compose up -d warp
```

If `registration delete` does not take, Cloudflare documents
`warp-cli --accept-tos registration delete-all` as the stronger form.

The client was renamed to **Cloudflare One Client** in 2026, but `warp-cli`
and its subcommands are unchanged and Cloudflare's own release notes still
use them. CHECKED 2026-09-04: the latest Linux client is 2026.7.1377.0 and
the pinned image is built on that exact version, so there is no upgrade to
be had here -- do not spend time bumping it when a fetch starts failing.

Cloudflare's own permanent answer, **dedicated egress IPs** (static
addresses no other customer shares), is an add-on to Zero Trust
**Enterprise** and provisioned by an account team. Out of reach for this
deployment; noted so it is not rediscovered as an option every outage.

Record the `ip=` before and after — if it did not change, the delete did not
take and there is no point testing a download.

**It is a dice roll, not a fix.** Free WARP draws from Cloudflare's own WARP
range, so if the source has flagged the RANGE rather than one address, a
fresh enrolment lands somewhere equally flagged. Worth two or three attempts
because it is free and takes a minute; if none of them take, the address pool
is the problem and §1 residential is the answer.

---

## 3. THE MANUAL STEP, AND WHY THERE ISN'T ONE ANY MORE

Compose puts every service in `docker-compose.yml` on the app's own network
and gives it the bare service name as a network alias. That alias is the
entire mechanism behind `socks5://warp:1080`, the same one behind
`redis://dragonfly:6379`. **Nothing has to be run after a deploy.**

```bash
sudo docker exec $(sudo docker ps -qf name=worker) getent hosts warp
# expect an address
```

### What it used to be, because the shape of the bug is worth keeping

`warp` was a standalone Coolify resource, which Coolify puts on the shared
`coolify` network while the app's containers sit on the app's own. **They
cannot see each other by default**, and `--network` in *Custom Docker Run
Options* is silently stripped by Coolify — that was tried, and it does not
work.

The only thing that made it work was a hand-run attach:

```bash
sudo docker network connect --alias warp <app-network> <warp-container>
```

...which **every redeploy or restart of the proxy silently undid**, because
the container is recreated and the attach lives on the container, not on the
resource. The failure mode was: deploy the proxy, everything looks healthy,
and every YouTube run fails until someone remembers one command. It was
lost at least once. That is the defect this section used to document as
routine operation.

A `warp-egress` resource may still exist in Coolify. Nothing references it;
it can be stopped.

### Why not just put the app on the `coolify` network instead

Because it is a security regression. That network has 7 other containers on
it, and Dragonfly runs with an **empty `requirepass`** — joining it would
expose an unauthenticated Redis holding the job queue to every other app on
the box. Attaching warp to the app's network is the narrow direction: warp
holds no secrets.

### The durable fix, applied 2026-09-03

`warp` is a service in `docker-compose.yml`: on the app network by
construction, aliased `warp` by construction, and its configuration — image
pin, capabilities, sysctl, volume, healthcheck — is in git and reviewable
rather than living in a Coolify form. This is how it was originally built,
it was moved to a separate resource by preference, and the manual attach
bit. It is back.

---

## 4. Operating it

### Is it healthy

The `warp` service carries a healthcheck that runs exactly this, so the
first answer is free:

```bash
sudo docker ps --filter name=warp --format "{{.Names}} | {{.Status}}"
# expect (healthy)
```

It proves the TUNNEL, not the listener. `gost` accepting connections on 1080
while WARP is disconnected is the state that fails every YouTube run, and a
port check passes in it — so the probe makes a real request THROUGH the
SOCKS port and requires Cloudflare to say the traffic arrived over WARP:

```bash
# tunnel actually egressing, not merely listening
W=$(sudo docker ps -qf name=warp)
sudo docker exec "$W" curl -s --socks5-hostname 127.0.0.1:1080 https://cloudflare.com/cdn-cgi/trace | grep -E '^(ip|warp)='
# expect: warp=on
```

### End-to-end, from the worker that actually downloads

```bash
C=$(sudo docker ps -qf name=worker)
sudo docker exec "$C" yt-dlp --proxy socks5://warp:1080 -f bestaudio/best -g https://www.youtube.com/shorts/5mU6SRS2Bxo
```

A `googlevideo.com` URL means the whole path works. Use `5mU6SRS2Bxo`;
**do not** test with `LiH-P4rSkLI`, which fails everywhere.

### Rollback

Set `MEDIA_PROXY_URL` to empty and redeploy. No code revert —
`download.ts` omits `--proxy` when the value is empty and every fetch goes
direct, exactly as it did before this feature. The `warp` container keeps
running harmlessly; it is not in anything's `depends_on`, so nothing waits
on it either way.

### Verify the credential-leak guard

```bash
bun run verify:proxy
```

Puts a canary password through five real yt-dlp failure shapes and a log
record. 8 paths, expected 0 leaks. **Run this if you ever change
`scrubProxy`, the logger's redaction list, or point `MEDIA_PROXY_URL` at an
authenticated proxy.**

---

## 4a. The other half: proof-of-origin tokens

A bot check has two halves, and the proxy only answers one. MEASURED
2026-09-04 on the production host, one Short, all six attempts, **every one
proxied**:

| pass | clients | result |
| --- | --- | --- |
| signed out | default, web_embedded, mweb | every one `Sign in to confirm you're not a bot` |
| signed **in** | default, web_embedded, mweb | past the challenge, then `page needs to be reloaded` / `Requested format is not available` |

The second row is not an address problem. Those clients require a
proof-of-origin token, and without one YouTube serves no usable formats —
the documented symptom. **The proxy changes where a request comes from; a
PO token changes what it can prove about itself.** The signed-in path needs
the second one, which is why rotating the exit fixes the first row and
leaves the second untouched.

`bgutil-pot` in `docker-compose.yml` mints them; the plugin that consumes
them is baked into the image (RUNBOOK.md §5); `MEDIA_POT_PROVIDER_URL`
points one at the other. Verified end to end before it shipped — token
minted cross-container, then the same 640,993-byte download on the default
client.

Upstream is explicit that a token **may** help and does not guarantee
bypassing a bot check. It is not a substitute for §2a or for a residential
proxy; it is the half of the problem those cannot reach.

---

## 5. Failure modes and what they mean

| symptom | meaning | action |
| --- | --- | --- |
| `DOWNLOAD_FAILED` + "outbound proxy is unavailable" | proxy unreachable. Was the missing network attach; now look at the `warp` healthcheck | §4 |
| `DOWNLOAD_FAILED` + "challenging this server as automated traffic" | the exit address is being challenged. **Read `proxied` on the `Download failed` log line** — this was written as "traffic went direct", which was only ever one of the two cases and mis-sent the 2026-09-04 outage looking for an unset variable | `proxied=true`: the WARP exit itself is flagged — rotate it (§2a) or switch `MEDIA_PROXY_URL`. `proxied=false`: check `MEDIA_PROXY_URL` is non-empty and `proxied` is set for the source |
| `SOURCE_UNAVAILABLE` + "no client offered a downloadable audio format" | source-side, and **no client said anything more useful** | A/B the yt-dlp pin first (§1a), then reproduce from residential |
| `SOURCE_UNAVAILABLE` + "refused this server with HTTP 403" | a CDN refusal was the most informative thing any client returned | A/B the yt-dlp pin (§1a) |
| every YouTube run fails at once | the shared exit was flagged | delete WARP registration and restart, or switch `MEDIA_PROXY_URL` to another proxy |

A proxy outage resolves to `DOWNLOAD_FAILED`, which the queue **retries**. It
is deliberately not `SESSION_EXPIRED` — a dead tunnel says nothing about the
user's credential, and classifying it that way would burn a reject against a
working session. `PROXY_UNREACHABLE` is the *first* rung of the ladder in
`src/lib/media/classify.ts`, ahead of the 403 rung, because the SOCKS layer
reports a refused tunnel as a 403 in some yt-dlp versions; read as
`CLIENT_REFUSED` it would classify permanent and the run would never retry.
It is additionally guarded on whether the attempt **actually used the
proxy**, so an unproxied source cannot be diagnosed as our egress failing
because the word "proxy" happened to appear in someone else's error text.

Which rung fires is decided across **every** attempt, not just the last one.
Before 2026-09-03 a proxied YouTube fetch whose default client returned 403
and whose fallback clients then returned "no formats" was reported as the
second thing — an extractor problem — and the 403 that pointed at a stale
yt-dlp pin was discarded. RUNBOOK.md §4.3 has the full order.

---

## 6. Security notes

* **Never give `warp` a domain, and never add `ports:` to it.** Coolify
  auto-assigned the old standalone resource a domain from the wildcard on
  creation and it was removed immediately. `gost -L :1080` auto-detects HTTP
  as well as SOCKS5, so either a public route or a published port would be a
  usable **open proxy** on a public VPS. The compose service publishes
  nothing (`expose`, not `ports`) and carries no proxy labels; keep it that
  way, and confirm with `sudo docker port $(sudo docker ps -qf name=warp)`
  returning empty.
* **`MEDIA_PROXY_URL` is treated as a credential.** It may legitimately be
  `socks5://user:pass@host`, yt-dlp echoes the proxy it was handed when it
  cannot reach it, and that stderr is stored on the run and shown to the
  user. `scrubProxy` strips it at the single point stderr enters the program.
  `proxy` is in the logger's redaction words; `proxied` (the boolean the
  download step logs) deliberately is not.
* **Do not add `--no-check-certificates`.** With HTTPS through the tunnel the
  operator sees only opaque traffic while certificate validation is on. That
  one flag is what would turn this from safe into credential-leaking.

---

## 7. Open questions and honest caveats

* **Free WARP is a CONSUMER product.** Using it as server-side egress is
  outside its intended use and Cloudflare may rate-limit or block it. The
  sanctioned paths are WARP Connector or a Zero Trust plan. This is a
  business decision, and it is the largest risk in the whole feature. Neither
  needs an application code change — only the `warp` service block in
  `docker-compose.yml`, or `MEDIA_PROXY_URL` pointed elsewhere.
* **One shared exit.** If it is flagged, everything fails at once. A proxy
  pool would degrade gradually instead.
* **The signed-in path is UNTESTED.** Anonymous is 11/12, so cookies are no
  longer needed for public Shorts and the Vault's "Connect YouTube" wizard is
  no longer load-bearing for basic YouTube function. What is untested is
  whether a signed-in jar is *accepted* from a WARP address, and whether
  routing a live Google session through a foreign consumer IP trips Google's
  account-security heuristics. Current behaviour sends the jar through the
  proxy when one exists. Test it on an account you can afford to have
  challenged.
* **A free-proxy pool also works**, if WARP is ever blocked: 1888 raw
  proxyscrape entries -> 484 that tunnel TLS from prod -> 34/60 clearing the
  bot check -> 32/34 still working 20 minutes later, latency 12-114s.
  Rejected in favour of WARP (2-3s, one known operator, no pool logic to
  maintain) and because many open proxies are misconfigured or compromised
  machines whose owners did not consent.

## 8. Why not `@hoangquyet/ytdown`

This work began as "replace yt-dlp with ytdown for YouTube". Abandoned on
evidence: ytdown is bot-checked from the prod IP on 8 of 9 videos, its
`YTW_SESSION` is never consulted because the player call throws first, and it
has **no proxy support of any kind** (`src/net/http.js` hardcodes `node:https`
agents). Every lever that fixes this problem is a yt-dlp lever. yt-dlp needed
no code change to work — only a flag.
