"use client"

import { UserIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { avatarGradient, initials } from "@/lib/avatar"

export function ProfileCard({
  user,
}: {
  user: { name: string; email: string; avatar?: string }
}) {
  const router = useRouter()
  const [name, setName] = useState(user.name)
  const [pending, setPending] = useState(false)
  const dirty = name.trim().length > 0 && name.trim() !== user.name

  async function save() {
    if (!dirty || pending) return
    setPending(true)
    const result = await authClient.updateUser({ name: name.trim() })
    setPending(false)
    if (result.error) {
      toast.add({
        type: "error",
        title: "Could not update profile",
        description: result.error.message,
      })
      return
    }
    toast.add({ type: "success", title: "Profile updated" })
    router.refresh()
  }

  return (
    <Card className="fade-in slide-in-from-bottom-2 animate-in fill-mode-both ring-foreground/10">
      <CardHeader className="flex items-center gap-2 border-b pb-4">
        <HugeiconsIcon
          icon={UserIcon}
          strokeWidth={1.5}
          className="size-5 text-emerald-600 dark:text-emerald-400"
        />
        <div>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>How you appear across Relay.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <FieldGroup>
          <div className="flex items-center gap-4">
            <Avatar className="size-14 rounded-lg">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback
                className="rounded-lg font-semibold text-lg text-white/90 tracking-wide shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_2px_rgba(0,0,0,0.35)] ring-1 ring-white/10"
                style={{ backgroundImage: avatarGradient(user.email) }}
              >
                {initials(name || user.name)}
              </AvatarFallback>
            </Avatar>
            <p className="text-muted-foreground text-xs leading-6">
              Your avatar is generated from your initials, or pulled from your
              Google account if you signed in that way.
            </p>
          </div>
          <Field>
            <FieldLabel htmlFor="settings-name">Display name</FieldLabel>
            <Input
              id="settings-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="settings-email">Email</FieldLabel>
            <Input id="settings-email" value={user.email} disabled />
            <FieldDescription>
              Contact support to change the email on your account.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end border-t">
        <Button
          onClick={save}
          disabled={!dirty || pending}
          className="transition-all duration-200 hover:-translate-y-px"
        >
          {pending ? <Spinner data-icon="inline-start" /> : null}
          Save changes
        </Button>
      </CardFooter>
    </Card>
  )
}
