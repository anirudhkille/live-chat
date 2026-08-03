import { Outlet, useLocation } from "react-router-dom"
import { MessageCircle } from "lucide-react"
import { useIsDesktop } from "@/hooks/use-media-query"
import { Sidebar } from "@/layout/sidebar"
import { BottomNav } from "@/layout/bottom-nav"

function EmptySelection() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
      <MessageCircle className="h-8 w-8" />
      <p className="text-sm">Select a chat to start messaging</p>
    </div>
  )
}

export function ChatLayout() {
  const isDesktop = useIsDesktop()
  const { pathname } = useLocation()
  const isChatListRoot = pathname === "/chats"

  if (isDesktop) {
    return (
      <div className="grid h-dvh grid-cols-[280px_minmax(0,1fr)]">
        <Sidebar />
        <main className="min-w-0 overflow-hidden">
          {isChatListRoot ? <EmptySelection /> : <Outlet />}
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">
        {isChatListRoot ? <Sidebar className="border-none" /> : <Outlet />}
      </div>
      {isChatListRoot && <BottomNav />}
    </div>
  )
}
