"use client"

import { useTheme } from "next-themes"
import { flushSync } from "react-dom"

import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar"
import { Spin } from "@/components/ui/spin"

/**
 * Sidebar theme toggle: label on the left, the toggles.dev Spin sun/moon
 * control on the right (flex-row-reverse puts the SVG at the end). Theme
 * switches run inside a View Transition — the new theme reveals in an
 * expanding circle from the click point. Falls back to an instant switch
 * without the API or under reduced motion.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  function toggleTheme(event: React.MouseEvent<HTMLButtonElement>) {
    const next = resolvedTheme === "dark" ? "light" : "dark"
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches

    if (!document.startViewTransition || reduceMotion) {
      setTheme(next)
      return
    }

    // Origin from the sun/moon icon's own on-screen position rather than
    // the raw click/tap coordinates — touch taps on mobile don't reliably
    // report clientX/clientY at the tap point (observed starting the ripple
    // from the top of the screen instead of the icon).
    const icon = event.currentTarget.querySelector("svg")
    const rect = (icon ?? event.currentTarget).getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const transition = document.startViewTransition(() => {
      flushSync(() => setTheme(next))
    })
    transition.ready.then(() => {
      const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      )
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 650,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      )
    })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Spin
          duration={500}
          onClick={toggleTheme}
          className="flex h-10 w-full flex-row-reverse items-center justify-between rounded-md px-3 text-xl transition-all duration-200 hover:bg-amber-500 hover:text-white active:scale-[0.98] group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 dark:hover:bg-indigo-500 dark:hover:text-white"
        >
          <span className="text-sm group-data-[collapsible=icon]:hidden">
            Dark mode
          </span>
        </Spin>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
