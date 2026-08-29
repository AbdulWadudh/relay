"use client"

import * as React from "react"

import { initTelemetry, trackError } from "@/lib/observability/client"

/**
 * Boots client RUM (page loads, global errors) and catches React render
 * errors via an error boundary, reporting both to OpenObserve through the
 * /api/v1/telemetry proxy (DESIGN §3).
 */

interface ErrorBoundaryState {
  hasError: boolean
}

class TelemetryErrorBoundary extends React.Component<
  React.PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    trackError(error, `react_boundary:${info.componentStack ?? "unknown"}`)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-svh items-center justify-center p-6">
          <p className="text-muted-foreground text-sm">
            Something went wrong. The error has been reported.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

export function TelemetryProvider({ children }: React.PropsWithChildren) {
  React.useEffect(() => {
    initTelemetry()
  }, [])

  return <TelemetryErrorBoundary>{children}</TelemetryErrorBoundary>
}
