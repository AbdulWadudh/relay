import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Relay.",
}

export default function TermsPage() {
  return (
    <main className="min-h-svh overflow-auto bg-background px-6 py-16 text-foreground sm:px-10">
      <article className="mx-auto max-w-3xl space-y-10">
        <header className="space-y-3">
          <Link className="font-heading text-sm text-primary" href="/">
            Relay
          </Link>
          <h1 className="font-heading text-4xl font-semibold tracking-tight">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: August 30, 2026
          </p>
        </header>

        <section className="space-y-4 text-sm leading-7 text-muted-foreground">
          <p>
            These Terms govern your use of the Relay installation operated by
            us. By creating an account or using Relay, you agree to these Terms.
          </p>

          <h2 className="pt-4 font-heading text-xl font-semibold text-foreground">
            The service
          </h2>
          <p>
            Relay provides tools for connecting accounts, processing media, and
            publishing content to third-party services. Features may change, and
            third-party services remain subject to their own terms, policies,
            availability, and limits.
          </p>

          <h2 className="pt-4 font-heading text-xl font-semibold text-foreground">
            Your responsibilities
          </h2>
          <p>
            You are responsible for your account, credentials, connected
            services, submitted content, and compliance with applicable law. Do
            not use Relay to access content or accounts without permission,
            violate third-party terms, infringe rights, or distribute harmful or
            unlawful material.
          </p>

          <h2 className="pt-4 font-heading text-xl font-semibold text-foreground">
            Third-party integrations
          </h2>
          <p>
            When you connect Google, Notion, or another provider, you authorize
            Relay to use the permissions you approve. You can revoke provider
            access through that provider or remove the connection from Relay.
            Relay is not responsible for outages, changes, or actions taken by
            third-party services.
          </p>

          <h2 className="pt-4 font-heading text-xl font-semibold text-foreground">
            Availability and liability
          </h2>
          <p>
            Relay is provided on an “as available” basis. To the fullest extent
            permitted by law, the operator is not liable for indirect,
            incidental, special, consequential, or lost-data damages arising
            from your use of Relay or an integrated service.
          </p>

          <h2 className="pt-4 font-heading text-xl font-semibold text-foreground">
            Termination and changes
          </h2>
          <p>
            We may suspend or terminate access when necessary to protect the
            service, users, or third parties, or when these Terms are violated.
            We may update these Terms by posting a new version at this URL.
          </p>

          <h2 className="pt-4 font-heading text-xl font-semibold text-foreground">
            Contact
          </h2>
          <p>
            Questions about these Terms can be sent to
            <a
              className="ms-1 text-primary underline"
              href="mailto:support@relay.app"
            >
              support@relay.app
            </a>
            .
          </p>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground">
          <Link className="text-primary underline" href="/privacy">
            Privacy Policy
          </Link>
        </footer>
      </article>
    </main>
  )
}
