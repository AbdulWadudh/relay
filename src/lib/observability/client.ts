"use client"

import { openobserveLogs } from "@openobserve/browser-logs"
import { openobserveRum } from "@openobserve/browser-rum"

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

const browserOptions = {
  clientToken: process.env.NEXT_PUBLIC_OPENOBSERVE_CLIENT_TOKEN ?? "",
  applicationId:
    process.env.NEXT_PUBLIC_OPENOBSERVE_APPLICATION_ID ?? "relay-app",
  site: process.env.NEXT_PUBLIC_OPENOBSERVE_SITE ?? "",
  service: process.env.NEXT_PUBLIC_OPENOBSERVE_SERVICE ?? "relay-app",
  env: process.env.NODE_ENV ?? "production",
  version: process.env.NEXT_PUBLIC_OPENOBSERVE_VERSION ?? "0.1.0",
  organizationIdentifier: process.env.NEXT_PUBLIC_OPENOBSERVE_ORG ?? "",
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
  const message = error instanceof Error ? error.message : String(error)
  send({
    event_type: "client_error",
    source,
    message,
    stack: error instanceof Error ? error.stack : undefined,
  })
  if (browserOptions.clientToken && browserOptions.site) {
    openobserveLogs.logger.error(message, { source })
  }
}

export function trackInteraction(
  name: string,
  fields: Record<string, unknown> = {},
) {
  send({ event_type: "interaction", name, ...fields })
  if (browserOptions.clientToken && browserOptions.site) {
    openobserveLogs.logger.info(`Interaction: ${name}`, fields)
  }
}

let initialized = false

/** Wire global error listeners and the initial page-load beacon. */
export function initTelemetry() {
  if (initialized || typeof window === "undefined") return
  initialized = true

  if (
    browserOptions.clientToken &&
    browserOptions.site &&
    browserOptions.organizationIdentifier
  ) {
    openobserveRum.init({
      applicationId: browserOptions.applicationId,
      clientToken: browserOptions.clientToken,
      site: browserOptions.site,
      organizationIdentifier: browserOptions.organizationIdentifier,
      service: browserOptions.service,
      env: browserOptions.env,
      version: browserOptions.version,
      trackResources: true,
      trackLongTasks: true,
      trackUserInteractions: true,
      apiVersion: "v1",
      defaultPrivacyLevel: "mask-user-input",
      sessionSampleRate: 100,
      sessionReplaySampleRate: 50,
    })
    openobserveLogs.init({
      clientToken: browserOptions.clientToken,
      site: browserOptions.site,
      organizationIdentifier: browserOptions.organizationIdentifier,
      service: browserOptions.service,
      env: browserOptions.env,
      version: browserOptions.version,
      forwardErrorsToLogs: true,
      insecureHTTP: false,
      apiVersion: "v1",
    })
    openobserveRum.startSessionReplayRecording()
  }

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
