// Curated gradient set in the app's emerald/lime editorial-tech palette (plus
// a few accent hues for visual variety once multiple users share a surface).
// Picked deterministically from a seed (usually the user's email) so the
// same person always gets the same avatar color instead of it changing on
// every render.
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #6ee7b7 0%, #047857 100%)",
  "linear-gradient(135deg, #d8f27e 0%, #4d6b39 100%)",
  "linear-gradient(135deg, #7dd3fc 0%, #0369a1 100%)",
  "linear-gradient(135deg, #fcd34d 0%, #b45309 100%)",
  "linear-gradient(135deg, #c4b5fd 0%, #6d28d9 100%)",
  "linear-gradient(135deg, #fda4af 0%, #9f1239 100%)",
]

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("")
}

export function avatarGradient(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
}
