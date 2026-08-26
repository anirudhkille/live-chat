"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Loader2,
  Lock,
  LogOut,
  User,
} from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/hooks/use-auth"
import { useLogout } from "@/hooks/use-logout"
import { useIsDesktop } from "@/hooks/use-media-query"

const ITEMS = [
  { icon: User, label: "Edit profile", to: "/settings/profile", enabled: true },
  { icon: Bell, label: "Notifications", to: null, enabled: false },
  { icon: Lock, label: "Privacy", to: null, enabled: false },
]

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

export default function SettingsPage() {
  const router = useRouter()
  const isDesktop = useIsDesktop()
  const { user } = useAuth()
  const logout = useLogout()

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b p-3">
        {!isDesktop && (
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.push("/chats")}
            className="p-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <span className="text-sm font-medium">Settings</span>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-col items-center border-b p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-base font-medium text-primary-foreground">
          {initials(user?.name ?? user?.email ?? "?")}
        </div>
        <p className="mt-2 text-sm font-medium">{user?.name}</p>
        <p className="text-xs text-muted-foreground">{user?.email}</p>
      </div>

      <div className="flex-1 p-2">
        {ITEMS.map(({ icon: Icon, label, to, enabled }) =>
          enabled && to ? (
            <Link
              key={label}
              href={to}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">{label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ) : (
            <button
              key={label}
              type="button"
              disabled
              title="Available once more settings APIs are connected"
              className="flex w-full cursor-not-allowed items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm opacity-50"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">{label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-accent disabled:opacity-60"
        >
          {logout.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          Log out
        </button>
      </div>
    </div>
  )
}
