import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { betterAuth } from "better-auth"

import config from "@/config"
import { getDb } from "@/lib/db"
import * as schema from "@/lib/db/schema"

// Better Auth's drizzle adapter looks up `schema[model]` where `model` is
// sometimes the base model name ("user") and sometimes the configured
// modelName override ("auth_users") depending on the code path — the
// "auth_verifications" 500 on Google sign-in was this: only the base-name
// key was aliased, so any path resolving by the override name found nothing.
// Aliasing both to the same table works regardless of which one is used.
const authSchema = {
  ...schema,
  user: schema.authUsers,
  auth_users: schema.authUsers,
  session: schema.authSessions,
  auth_sessions: schema.authSessions,
  account: schema.authAccounts,
  auth_accounts: schema.authAccounts,
  verification: schema.authVerifications,
  auth_verifications: schema.authVerifications,
}

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: "sqlite",
    schema: authSchema,
  }),
  baseURL: config.auth.baseUrl,
  basePath: "/api/v1/auth",
  secret: config.auth.secret,
  trustedOrigins: [config.auth.baseUrl],
  user: { modelName: "auth_users" },
  session: { modelName: "auth_sessions" },
  account: {
    modelName: "auth_accounts",
    accountLinking: { trustedProviders: ["google"] },
  },
  verification: { modelName: "auth_verifications" },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    google: {
      clientId: config.auth.googleClientId,
      clientSecret: config.auth.googleClientSecret,
      requireEmailVerification: false,
    },
  },
})

export type AuthSession = typeof auth.$Infer.Session
