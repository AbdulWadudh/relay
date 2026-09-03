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
worker container  --socks5://warp:1080-->  warp-egress  --WireGuard-->  Cloudflare
   (app network)                          (Coolify resource)                |
                                                                            v
                                                                        YouTube
```

| piece | where it lives |
| --- | --- |
| `MEDIA_PROXY_URL` | Coolify env var on `relay:main`, value `socks5://warp:1080` |
| the proxy itself | Coolify resource **`warp-egress`**, image `caomingjun/warp:2026.7.1377.0-2.12.0` |
| which sources use it | `proxied` flag in `src/lib/media/sources.ts` |
| the flag being applied | `src/lib/media/download.ts`, `--proxy` |

`warp-egress` is a **separate Coolify resource**, not a service in
`docker-compose.yml`. It runs Cloudflare's official `warp-svc` daemon with
`gost` exposing SOCKS5 on 1080.

### No authentication is required

Free WARP self-enrols. No Cloudflare account, no email, no license key —
`WARP_LICENSE_KEY` is empty and the container generated its own device
identity on first start (`Account type: Free`). **This feature introduces no
new secret**, which is why nothing was added to the vault.

The registration lives in the container's `/var/lib/cloudflare-warp/`. If the
exit address is ever blocked, delete it and restart: it re-enrols anonymously
with a fresh address. Nothing of yours is tied to it.

---

## 3. THE MANUAL STEP — read this before touching `warp-egress`

Coolify puts a standalone resource on the shared `coolify` network. The app's
containers are on `djtrhq2qxxyt1doyonjctwcb`. **They cannot see each other by
default**, and `--network` in *Custom Docker Run Options* is silently
stripped by Coolify — it was tried and it does not work.

So after **every deploy or restart of `warp-egress`**, re-attach it:

```bash
ssh ubuntu@144.24.126.27
C=$(sudo docker ps --format '{{.Names}}' | grep vbub6kovmw5g2symo9hswzba)
sudo docker network connect --alias warp djtrhq2qxxyt1doyonjctwcb "$C"
```

Verify:

```bash
sudo docker exec $(sudo docker ps -qf name=worker-djtrhq) getent hosts warp
# expect: 10.0.8.x   warp
```

Deploying **`relay:main`** does not require this. Only `warp-egress` being
recreated does.

### Why not just put the app on the `coolify` network instead

Because it is a security regression. That network has 7 other containers on
it, and Dragonfly runs with an **empty `requirepass`** — joining it would
expose an unauthenticated Redis holding the job queue to every other app on
the box. Attaching warp to the app's network is the narrow direction: warp
holds no secrets.

### The durable alternative

Move `warp` back to a service in `docker-compose.yml`. Compose puts it on the
app network automatically with the `warp` alias, no manual attach, and the
config lives in git. That is how this was originally built and it is
strictly more robust; it was changed to a separate resource by preference.
If the manual attach ever bites, this is the fix.

---

## 4. Operating it

### Is it healthy

```bash
# tunnel actually egressing, not merely listening
sudo docker exec $(sudo docker ps -qf name=vbub6kov) \
  curl -s --socks5-hostname 127.0.0.1:1080 https://api.cloudflare.com/cdn-cgi/trace | grep -E '^(ip|warp)='
# expect: warp=on
```

### End-to-end, from the worker that actually downloads

```bash
sudo docker exec $(sudo docker ps -qf name=worker-djtrhq) \
  yt-dlp --proxy socks5://warp:1080 -f bestaudio/best -g \
  https://www.youtube.com/shorts/5mU6SRS2Bxo
```

A `googlevideo.com` URL means the whole path works. Use `5mU6SRS2Bxo`;
**do not** test with `LiH-P4rSkLI`, which fails everywhere.

### Rollback

Set `MEDIA_PROXY_URL` to empty on `relay:main` and redeploy. No code revert —
`download.ts` omits `--proxy` when the value is empty and every fetch goes
direct, exactly as it did before this feature. `warp-egress` can keep running
harmlessly.

### Verify the credential-leak guard

```bash
bun run verify:proxy
```

Puts a canary password through five real yt-dlp failure shapes and a log
record. 8 paths, expected 0 leaks. **Run this if you ever change
`scrubProxy`, the logger's redaction list, or point `MEDIA_PROXY_URL` at an
authenticated proxy.**

---

## 5. Failure modes and what they mean

| symptom | meaning | action |
| --- | --- | --- |
| `DOWNLOAD_FAILED` + "outbound proxy is unavailable" | proxy unreachable — almost always the missing network attach | §3 |
| `SOURCE_UNAVAILABLE` + "challenging this server as automated traffic" | traffic went **direct**; the proxy was not used | check `MEDIA_PROXY_URL` is non-empty and `proxied` is set for the source |
| `SOURCE_UNAVAILABLE` + "no client offered a downloadable audio format" | source-side | reproduce from residential before blaming the proxy |
| every YouTube run fails at once | the shared exit was flagged | delete WARP registration and restart, or switch `MEDIA_PROXY_URL` to another proxy |

A proxy outage resolves to `DOWNLOAD_FAILED`, which the queue **retries**. It
is deliberately not `SESSION_EXPIRED` — a dead tunnel says nothing about the
user's credential, and classifying it that way would burn a reject against a
working session. `PROXY_UNREACHABLE` is tested *first* in `download.ts`,
ahead of the 403 branch, because the SOCKS layer reports a refused tunnel as
a 403 in some yt-dlp versions; read as `CLIENT_REFUSED` it would classify
permanent and the run would never retry.

---

## 6. Security notes

* **Never give `warp-egress` a domain.** Coolify auto-assigned one from the
  wildcard on creation and it was removed immediately. `gost -L :1080`
  auto-detects HTTP as well as SOCKS5, so a public route would be a usable
  **open proxy**. Confirm no `caddy_*` / `traefik.*` labels on the container
  and that 1080 is not published to the host.
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
  needs an application code change — only `warp-egress`'s own configuration.
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
