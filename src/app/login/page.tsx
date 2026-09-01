import type { Metadata } from "next"
import Link from "next/link"

import LoginForm from "@/app/login/login-form"
import config from "@/config"

export const metadata: Metadata = { title: "Sign in" }

export default function LoginPage() {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.14),transparent_36%),radial-gradient(circle_at_80%_80%,rgba(124,58,237,0.12),transparent_34%)]"
      />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl shadow-emerald-950/20 md:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden flex-col justify-between border-border/70 border-r bg-muted/20 p-10 md:flex">
          <div>
            <Link
              href="/"
              className="font-heading font-semibold text-lg tracking-wide"
            >
              {config.app.name}
            </Link>
            <p className="mt-24 max-w-md font-heading font-semibold text-5xl leading-[1.05] tracking-tight">
              Short-form video, turned into knowledge you can trust.
            </p>
            <p className="mt-6 max-w-md text-base text-muted-foreground leading-7">
              Relay pulls the audio from a Reel or a Short, transcribes it, and
              publishes structured notes to your workspace — with every
              extracted detail tied to a timestamped quote from the transcript.
            </p>
          </div>
          <p className="font-mono text-emerald-400 text-xs uppercase tracking-[0.22em]">
            Self-hosted · bring your own keys
          </p>
        </section>
        <section className="p-7 sm:p-10">
          <div className="mb-8 md:hidden">
            <Link
              href="/"
              className="font-heading font-semibold text-lg tracking-wide"
            >
              {config.app.name}
            </Link>
          </div>
          <LoginForm />
          <p className="mt-8 text-center text-muted-foreground text-xs">
            By continuing, you agree to our{" "}
            <Link
              className="text-foreground underline underline-offset-4"
              href="/terms"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              className="text-foreground underline underline-offset-4"
              href="/privacy"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
