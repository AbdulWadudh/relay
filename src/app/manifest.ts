import type { MetadataRoute } from "next"

import config from "@/config"

// Colours are globals.css `--background` in hex: light #ffffff, dark #09090b.
// Single-valued fields take dark because ThemeProvider defaults to dark; the
// per-scheme pair is `viewport.themeColor` in the root layout.
export default function manifest(): MetadataRoute.Manifest {
  return {
    // Pinned so changing start_url later doesn't orphan existing installs.
    id: "/",
    name: config.app.name,
    short_name: config.app.name,
    description: config.app.description,
    lang: "en",
    dir: "ltr",
    categories: ["productivity", "utilities"],
    display: "standalone",
    scope: "/",
    start_url: "/runs",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        // Separate art: a launcher mask crops this, so it needs an opaque
        // full-bleed field and content inside the safe circle.
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // ⚠ Bubblewrap generates the Android ACTION_SEND intent-filter from this
    // block at init/update time only — change it and re-run `bubblewrap
    // update`, or the installed app and the site disagree. See RUNBOOK.
    share_target: {
      action: "/share",
      method: "GET",
      enctype: "application/x-www-form-urlencoded",
      params: {
        url: "url",
        text: "text",
        title: "title",
      },
    },
  }
}
