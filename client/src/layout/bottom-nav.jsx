import { NavLink } from "react-router-dom"
import { MessageCircle, Search, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const TABS = [
  { to: "/chats", label: "Chats", icon: MessageCircle },
  { to: "/search", label: "Search", icon: Search },
  { to: "/settings", label: "Settings", icon: Settings },
]

export function BottomNav() {
  return (
    <nav className="flex h-14 items-center justify-around border-t bg-card">
      {TABS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/chats"}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-0.5 px-4 text-[11px]",
              isActive ? "text-primary" : "text-muted-foreground"
            )
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
