import { ScrollArea } from "@/components/ui/scroll-area"
import { SidebarTrigger } from "@/components/ui/sidebar"

/**
 * Workbench chrome inside SidebarInset (RULES.md: root never scrolls;
 * ScrollArea is the single designated scroll container).
 */

export function ShellHeader({
  title,
  children,
}: React.PropsWithChildren<{ title: string }>) {
  return (
    <header className="z-10 flex h-16 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
      <SidebarTrigger className="-ms-1 transition-all duration-200 hover:-translate-y-px hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600" />
      <h1 className="ms-1 font-semibold text-lg">{title}</h1>
      {children ? (
        <div className="ms-auto flex items-center gap-3">{children}</div>
      ) : null}
    </header>
  )
}
export function ShellContent({
  children,
  fill = false,
}: React.PropsWithChildren<{ fill?: boolean }>) {
  if (fill) {
    return (
      <div className="z-10 flex min-h-0 flex-1 flex-col p-4 sm:p-8">
        {children}
      </div>
    )
  }

  return (
    <ScrollArea className="z-10 min-h-0 flex-1">
      <div className="p-4 sm:p-8">{children}</div>
    </ScrollArea>
  )
}
