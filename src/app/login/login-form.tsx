"use client"

import Google from "@thesvg/react/google"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"

export default function LoginForm() {
  const router = useRouter()
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setPending(true)
    const result =
      mode === "signin"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ name, email, password })
    setPending(false)
    if (result.error) {
      setError(result.error.message ?? "Unable to authenticate")
      return
    }
    router.push("/runs")
    router.refresh()
  }

  async function continueWithGoogle() {
    setError("")
    setPending(true)
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/runs",
    })
    if (result.error) {
      setPending(false)
      setError(result.error.message ?? "Unable to continue with Google")
    }
  }

  return (
    <div>
      <div className="mb-8">
        <p className="font-mono text-emerald-400 text-xs uppercase tracking-[0.2em]">
          Welcome to Relay
        </p>
        <h1 className="mt-3 font-heading font-semibold text-3xl tracking-tight">
          {mode === "signin" ? "Sign in to Relay" : "Create your account"}
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          {mode === "signin"
            ? "Pick up where your last run left off."
            : "Start turning videos into structured, sourced notes."}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        onClick={continueWithGoogle}
        disabled={pending}
      >
        {/* Official multicolour Google mark — renders correctly on both
            the light and dark surfaces without a variant override. */}
        <Google className="size-5" aria-hidden data-icon="inline-start" />
        Continue with Google
      </Button>
      <div className="my-6 flex items-center gap-3 text-muted-foreground text-xs">
        <div className="h-px flex-1 bg-border" />
        <span>or use email</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <form className="space-y-4" onSubmit={submit}>
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button type="submit" className="h-11 w-full" disabled={pending}>
          {pending
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </Button>
      </form>
      <button
        type="button"
        className="mt-6 block w-full text-center text-muted-foreground text-sm hover:text-foreground"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin")
          setError("")
        }}
      >
        {mode === "signin"
          ? "New to Relay? Create an account"
          : "Already have an account? Sign in"}
      </button>
    </div>
  )
}
