import type { Metadata } from "next"
import { JetBrains_Mono, Oxanium, Space_Grotesk } from "next/font/google"

import "./globals.css"
import { TelemetryProvider } from "@/components/telemetry-provider"
import { ThemeProvider } from "@/components/theme-provider"
import config from "@/config"
import { cn } from "@/lib/utils"

const oxaniumHeading = Oxanium({
  subsets: ["latin"],
  variable: "--font-heading",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  metadataBase: new URL(config.app.baseUrl),
  title: {
    default: config.app.name,
    template: `%s · ${config.app.name}`,
  },
  description: config.app.description,
  icons: {
    icon: config.assets.favicon,
    apple: config.assets.logo,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        spaceGrotesk.variable,
        oxaniumHeading.variable,
      )}
    >
      <body>
        <ThemeProvider storageKey={config.theme.storageKey}>
          <TelemetryProvider>{children}</TelemetryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
