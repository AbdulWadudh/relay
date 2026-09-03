"use client"

import * as React from "react"

// updateViaCache: "none" — otherwise a stale sw.js can be revalidated from
// the HTTP cache and a cache-strategy fix stays unshipped.
export function ServiceWorker() {
  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    let cancelled = false
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((registration) => {
          if (cancelled) return
          // An installed app can stay open for days without a navigation.
          registration.update().catch(() => {})
        })
        .catch((error) => {
          console.warn("[pwa] service worker registration failed:", error)
        })
    }

    if (document.readyState === "complete") {
      register()
    } else {
      window.addEventListener("load", register, { once: true })
    }

    return () => {
      cancelled = true
      window.removeEventListener("load", register)
    }
  }, [])

  return null
}
