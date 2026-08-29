import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { betterAuth } from "better-auth"

import config from "@/config"
import { getDb } from "@/lib/db"
import * as schema from "@/lib/db/schema"

const authSchema = {
  ...schema,
  user: schema.authUsers,
  session: schema.authSessions,
  account: schema.authAccounts,
  verification: schema.authVerifications,
}

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: "sqlite",
    schema: authSchema,
  }),
  baseURL: config.auth.baseUrl,
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
