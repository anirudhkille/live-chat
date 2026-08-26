"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search, Settings, SquarePen } from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

function initials(source: string) {
  return (
    source
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  )
}

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <aside
      className={cn("flex h-full w-full flex-col border-r bg-card", className)}
    >
      <div className="flex items-center gap-2 border-b p-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
          {initials(user?.name ?? user?.email ?? "?")}
        </div>
        <span className="truncate text-sm font-medium">
          {user?.name ?? "Account"}
        </span>
        <Link
          href="/search"
          aria-label="Search"
          className="ml-auto rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent"
        >
          <Search className="h-4 w-4" />
        </Link>
        <Link
          href="/chats/new"
          aria-label="New chat"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent"
        >
          <SquarePen className="h-4 w-4" />
        </Link>
      </div>

      <nav aria-label="Conversations" className="flex-1 overflow-y-auto">
        <p className="px-3 py-6 text-center text-xs text-muted-foreground">
          No conversations yet.
          <br />
          Start one with the new chat button.
        </p>
      </nav>

      <div className="flex items-center gap-1 border-t p-2">
        <ThemeToggle />
        <Link
          href="/settings"
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
          className={cn(
            "flex flex-1 items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent",
            pathname.startsWith("/settings") && "bg-accent",
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  )
}
