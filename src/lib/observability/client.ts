"use client"

/**
 * Client RUM telemetry (DESIGN §3): page loads, client errors, and user
 * interaction events. Events are proxied through POST /api/v1/telemetry so
 * OpenObserve credentials never reach the browser.
 */

export interface ClientEvent {
  event_type: "page_load" | "client_error" | "interaction"
  [key: string]: unknown
}

function send(event: ClientEvent) {
  try {
    const body = JSON.stringify({
      ...event,
      url: window.location.pathname,
      user_agent: navigator.userAgent,
    })
    if (!navigator.sendBeacon?.("/api/v1/telemetry", body)) {
      void fetch("/api/v1/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      })
    }
  } catch {
    // Telemetry must never break the app.
  }
}

export function trackPageLoad() {
  const [nav] = performance.getEntriesByType(
    "navigation",
  ) as PerformanceNavigationTiming[]
  send({
    event_type: "page_load",
    load_time_ms: nav
      ? Math.round(nav.loadEventEnd - nav.startTime)
      : undefined,
    ttfb_ms: nav ? Math.round(nav.responseStart - nav.startTime) : undefined,
    dom_interactive_ms: nav
      ? Math.round(nav.domInteractive - nav.startTime)
      : undefined,
  })
}

export function trackError(error: unknown, source: string) {
  send({
    event_type: "client_error",
    source,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })
}

export function trackInteraction(
  name: string,
  fields: Record<string, unknown> = {},
) {
  send({ event_type: "interaction", name, ...fields })
}

let initialized = false

/** Wire global error listeners and the initial page-load beacon. */
export function initTelemetry() {
  if (initialized || typeof window === "undefined") return
  initialized = true

  window.addEventListener("error", (event) =>
    trackError(event.error ?? event.message, "window.onerror"),
  )
  window.addEventListener("unhandledrejection", (event) =>
    trackError(event.reason, "unhandledrejection"),
  )

  if (document.readyState === "complete") {
    trackPageLoad()
  } else {
    window.addEventListener("load", () => trackPageLoad(), { once: true })
  }
}
