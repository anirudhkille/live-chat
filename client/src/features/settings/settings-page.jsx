import { useNavigate } from "react-router-dom"
import { ArrowLeft, User, Bell, Lock, LogOut, ChevronRight } from "lucide-react"
import { useIsDesktop } from "@/hooks/use-media-query"

const ITEMS = [
  { icon: User, label: "Edit profile", to: "/settings/profile" },
  { icon: Bell, label: "Notifications", to: "/settings/notifications" },
  { icon: Lock, label: "Privacy", to: "/settings/privacy" },
]

export function SettingsPage() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()

  function handleLogout() {
    navigate("/login")
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b p-3">
        {!isDesktop && (
          <button aria-label="Back" onClick={() => navigate("/chats")} className="p-1">
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <span className="text-sm font-medium">Settings</span>
      </header>

      <div className="flex flex-col items-center border-b p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-base font-medium text-primary-foreground">
          AK
        </div>
        <p className="mt-2 text-sm font-medium">Anirudh Kille</p>
        <p className="text-xs text-muted-foreground">anirudh@mail.com</p>
      </div>

      <div className="flex-1 p-2">
        {ITEMS.map(({ icon: Icon, label, to }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm hover:bg-accent"
          >
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-destructive hover:bg-accent"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </div>
  )
}
