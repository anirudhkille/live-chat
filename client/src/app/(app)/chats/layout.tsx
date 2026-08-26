"use client"

import { usePathname } from "next/navigation"

import { BottomNav } from "@/components/layout/bottom-nav"
import { Sidebar } from "@/components/layout/sidebar"
import { cn } from "@/lib/utils"

export default function ChatsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isRoot = pathname === "/chats"

  return (
    <div className="flex h-dvh flex-col">
      <div className="flex min-h-0 flex-1 overflow-hidden md:grid md:grid-cols-[280px_minmax(0,1fr)]">
        <Sidebar className={cn(!isRoot && "hidden md:flex")} />
        <main
          className={cn(
            "min-w-0 flex-1 overflow-hidden",
            isRoot && "hidden md:block",
          )}
        >
          {children}
        </main>
      </div>
      {isRoot && <BottomNav />}
    </div>
  )
}
