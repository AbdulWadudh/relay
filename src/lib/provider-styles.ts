/**
 * Per-provider Tailwind accents, split out of src/lib/providers.ts for the
 * same reason the icons were: these are DOM/Tailwind class strings, so
 * keeping them in the catalog made it renderer-coupled.
 *
 * Both themes are specified for every value. A bare `-300`/`-400` shade
 * reads fine on this app's near-black surfaces and washes out on white
 * (RULES.md), so `chip` pairs a dark shade with a darker light one. The dark
 * hover is `-900`, NOT `-950`: against a near-black card a -950 tint is
 * invisible, so dark mode lost the highlight light mode got from -50.
 */
export interface ProviderAccent {
  /** Row hover border + background highlight. */
  hover: string
  /** Icon tint, theme-paired. */
  chip: string
  /** SELECTED state — the same colours without the hover: prefix. */
  selected: string
  /** Solid fill for a badge or tick sitting on the accent. */
  solid: string
}

const PROVIDER_ACCENTS: Record<string, ProviderAccent> = {
  openai: {
    hover: "hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900",
    chip: "text-teal-700 dark:text-teal-300",
    selected: "border-teal-500 bg-teal-50 dark:bg-teal-900",
    solid: "bg-teal-600",
  },
  groq: {
    hover:
      "hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900",
    chip: "text-orange-700 dark:text-orange-300",
    selected: "border-orange-500 bg-orange-50 dark:bg-orange-900",
    solid: "bg-orange-600",
  },
  gemini: {
    hover: "hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900",
    chip: "text-blue-700 dark:text-blue-300",
    selected: "border-blue-500 bg-blue-50 dark:bg-blue-900",
    solid: "bg-blue-600",
  },
  openrouter: {
    hover:
      "hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900",
    chip: "text-violet-700 dark:text-violet-300",
    selected: "border-violet-500 bg-violet-50 dark:bg-violet-900",
    solid: "bg-violet-600",
  },
  ollama: {
    hover:
      "hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900",
    chip: "text-emerald-700 dark:text-emerald-300",
    selected: "border-emerald-500 bg-emerald-50 dark:bg-emerald-900",
    solid: "bg-emerald-600",
  },
  "ollama-cloud": {
    hover:
      "hover:border-fuchsia-500 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900",
    chip: "text-fuchsia-700 dark:text-fuchsia-300",
    selected: "border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-900",
    solid: "bg-fuchsia-600",
  },
}

const NEUTRAL_ACCENT: ProviderAccent = {
  hover: "hover:border-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800",
  chip: "text-zinc-700 dark:text-zinc-300",
  selected: "border-zinc-500 bg-zinc-50 dark:bg-zinc-800",
  solid: "bg-zinc-600",
}

export function providerAccent(id: string): ProviderAccent {
  return PROVIDER_ACCENTS[id] ?? NEUTRAL_ACCENT
}
