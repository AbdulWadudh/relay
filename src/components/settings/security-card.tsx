"use client"

import { GoogleIcon, LockPasswordIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { authClient } from "@/lib/auth-client"

export function SecurityCard({ hasPassword }: { hasPassword: boolean }) {
  return (
    <Card className="fade-in slide-in-from-bottom-2 animate-in fill-mode-both ring-foreground/10 delay-100">
      <CardHeader className="flex items-center gap-2 border-b pb-4">
        <HugeiconsIcon
          icon={LockPasswordIcon}
          strokeWidth={1.5}
          className="size-5 text-sky-600 dark:text-sky-400"
        />
        <div>
          <CardTitle className="text-base">Security</CardTitle>
          <CardDescription>Keep your account locked down.</CardDescription>
        </div>
      </CardHeader>
      {hasPassword ? <ChangePasswordForm /> : <SocialOnlyNotice />}
    </Card>
  )
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pending, setPending] = useState(false)
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword
  const invalid =
    currentPassword.length === 0 ||
    newPassword.length < 8 ||
    newPassword !== confirmPassword

  async function submit() {
    if (invalid || pending) return
    setPending(true)
    const result = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: false,
    })
    setPending(false)
    if (result.error) {
      toast.add({
        type: "error",
        title: "Could not change password",
        description: result.error.message,
      })
      return
    }
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    toast.add({ type: "success", title: "Password updated" })
  }

  return (
    <>
      <CardContent className="pt-2">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="settings-current-password">
              Current password
            </FieldLabel>
            <Input
              id="settings-current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="settings-new-password">
              New password
            </FieldLabel>
            <Input
              id="settings-new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <FieldDescription>At least 8 characters.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="settings-confirm-password">
              Confirm new password
            </FieldLabel>
            <Input
              id="settings-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              aria-invalid={mismatch}
            />
            {mismatch ? (
              <FieldDescription className="text-destructive">
                Passwords don't match.
              </FieldDescription>
            ) : null}
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end border-t">
        <Button
          onClick={submit}
          disabled={invalid || pending}
          className="transition-all duration-200 hover:scale-[1.03]"
        >
          {pending ? <Spinner data-icon="inline-start" /> : null}
          Update password
        </Button>
      </CardFooter>
    </>
  )
}

function SocialOnlyNotice() {
  return (
    <CardContent className="pt-2">
      <div className="flex items-center gap-3 rounded-md bg-muted px-4 py-3">
        <HugeiconsIcon icon={GoogleIcon} className="size-5 shrink-0" />
        <p className="text-muted-foreground text-sm leading-6">
          You sign in with Google, so there's no Relay password to manage —
          update your credentials from your Google account instead.
        </p>
      </div>
    </CardContent>
  )
}
