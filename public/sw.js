// Served from public/ rather than compiled out of src/lib/pwa: a worker's
// scope is its own directory, and /_next/static/service-worker/ can only
// control `/` with a Service-Worker-Allowed header from next.config.

// Bump to evict the previous generation in `activate`.
const PRECACHE = "relay-precache-v2"
const RUNTIME = "relay-runtime-v2"
const OWNED_CACHES = [PRECACHE, RUNTIME]

// /manifest.webmanifest is deliberately absent — a stale copy would let the
// installed app's share_target drift from the site's.
const PRECACHE_URLS = ["/offline.html", "/icons/icon-192.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE)
      await cache.addAll(
        PRECACHE_URLS.map((url) => new Request(url, { cache: "reload" })),
      )
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((name) => name.startsWith("relay-"))
          .filter((name) => !OWNED_CACHES.includes(name))
          .map((name) => caches.delete(name)),
      )
      await self.clients.claim()
    })(),
  )
})

// Whole /api prefix, not /api/v1, so bumping config.api.version can't open a
// caching hole. Never cached: every response is per-user and short-lived.
function isApi(url) {
  return url.pathname === "/api" || url.pathname.startsWith("/api/")
}

// Keyed off the header, not a path prefix, so `next dev` (no immutable
// header) caches nothing and can't serve a stale rebuilt chunk.
function isImmutable(response) {
  return (response.headers.get("cache-control") ?? "").includes("immutable")
}

// Reads across BOTH caches, writes only to RUNTIME: the offline page's icon
// is precached, and a RUNTIME-only lookup left it broken offline.
async function cacheFirst(request) {
  const hit = await caches.match(request)
  if (hit) return hit
  const response = await fetch(request)
  if (response.ok && isImmutable(response)) {
    const cache = await caches.open(RUNTIME)
    cache.put(request, response.clone()).catch(() => {})
  }
  return response
}

// Never cached: dashboard HTML is rendered for one signed-in user.
async function navigate(request) {
  try {
    return await fetch(request)
  } catch {
    const cache = await caches.open(PRECACHE)
    const offline = await cache.match("/offline.html")
    return (
      offline ??
      new Response("Offline", {
        status: 503,
        headers: { "content-type": "text/plain" },
      })
    )
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (isApi(url)) return

  if (request.mode === "navigate") {
    event.respondWith(navigate(request))
    return
  }

  // RSC payloads are fetches, not navigations, and carry per-user output.
  if (url.searchParams.has("_rsc")) return

  event.respondWith(cacheFirst(request))
})
