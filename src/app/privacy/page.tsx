import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Relay.",
}

export default function PrivacyPage() {
  return (
    <main className="min-h-svh overflow-auto bg-background px-6 py-16 text-foreground sm:px-10">
      <article className="mx-auto max-w-3xl space-y-10">
        <header className="space-y-3">
          <Link className="font-heading text-sm text-primary" href="/">
            Relay
          </Link>
          <h1 className="font-heading text-4xl font-semibold tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: August 30, 2026
          </p>
        </header>

        <section className="space-y-4 text-sm leading-7 text-muted-foreground">
          <p>
            Relay is a self-hosted tool that helps you connect media sources,
            process content, and publish structured pages to services you
            choose. This policy explains what information Relay handles when you
            use an installation operated by us.
          </p>

          <h2 className="pt-4 font-heading text-xl font-semibold text-foreground">
            Information we collect
          </h2>
          <p>
            When you create an account, we collect your email address, display
            name, and authentication information. If you sign in with Google, we
            receive the profile information Google makes available for the
            requested scopes, such as your email address, name, profile image,
            and account identifier.
          </p>
          <p>
            Relay also stores the connection information and encrypted access
            tokens you intentionally add to your vault. We do not sell your
            information or use your connected-service content for advertising.
          </p>

          <h2 className="pt-4 font-heading text-xl font-semibold text-foreground">
            How information is used
          </h2>
          <p>
            Account information is used to authenticate you, maintain your
            session, associate your vault with your account, and provide the
            Relay features you request. Connected-service tokens are used only
            to perform the integrations you initiate.
          </p>

          <h2 className="pt-4 font-heading text-xl font-semibold text-foreground">
            Storage and security
          </h2>
          <p>
            Relay stores application data in its configured database. Passwords
            are stored as one-way hashes, sessions use expiring secure cookies,
            and integration tokens are encrypted at rest. No security measure is
            perfect, so protect your account credentials and deployment secrets.
          </p>

          <h2 className="pt-4 font-heading text-xl font-semibold text-foreground">
            Your choices
          </h2>
          <p>
            You may sign out, remove connections from the vault, or request
            deletion of your account and associated data by contacting the
            operator of the Relay installation. For this installation, contact
            <a
              className="ms-1 text-primary underline"
              href="mailto:support@relay.app"
            >
              support@relay.app
            </a>
            .
          </p>

          <h2 className="pt-4 font-heading text-xl font-semibold text-foreground">
            Changes and contact
          </h2>
          <p>
            We may update this policy as Relay changes. The current version is
            always available at this URL. Questions about privacy can be sent to
            support@relay.app.
          </p>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground">
          <Link className="text-primary underline" href="/terms">
            Terms of Service
          </Link>
        </footer>
      </article>
    </main>
  )
}
