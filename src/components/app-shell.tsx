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
    <header className="fade-in slide-in-from-top-2 z-10 flex h-16 shrink-0 animate-in items-center gap-3 border-b fill-mode-both px-4 sm:px-6">
      <SidebarTrigger className="-ms-1 transition-all duration-200 hover:scale-110 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600" />
      <h1 className="ms-1 font-semibold text-lg">{title}</h1>
      {children ? (
        <div className="ms-auto flex items-center gap-3">{children}</div>
      ) : null}
    </header>
  )
}

export function ShellContent({ children }: React.PropsWithChildren) {
  return (
    <ScrollArea className="fade-in z-10 min-h-0 flex-1 animate-in fill-mode-both duration-500">
      <div className="p-4 sm:p-8">{children}</div>
    </ScrollArea>
  )
}
