import { NavLink, useNavigate } from "react-router-dom"
import { Search, SquarePen, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const MOCK_CHATS = [
  { id: "1", name: "Priya Sharma", lastMessage: "Sounds good, see you then", unread: 0, online: true },
  { id: "2", name: "Design team", lastMessage: "Rahul: shipped the update", unread: 3, online: false },
  { id: "3", name: "Karan Mehta", lastMessage: "Typing…", unread: 0, online: true },
]

function initials(name) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
}

export function Sidebar({ className }) {
  const navigate = useNavigate()

  return (
    <aside className={cn("flex h-full w-full flex-col border-r bg-card", className)}>
      <div className="flex items-center gap-2 border-b p-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
          AK
        </div>
        <span className="text-sm font-medium">Anirudh</span>
        <button
          aria-label="Search"
          onClick={() => navigate("/search")}
          className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-accent"
        >
          <Search className="h-4 w-4" />
        </button>
        <button
          aria-label="New chat"
          onClick={() => navigate("/chats/new")}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
        >
          <SquarePen className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {MOCK_CHATS.map((chat) => (
          <NavLink
            key={chat.id}
            to={`/chats/${chat.id}`}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent",
                isActive && "bg-accent"
              )
            }
          >
            <div className="relative shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                {initials(chat.name)}
              </div>
              {chat.online && (
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-green-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{chat.name}</p>
              <p className="truncate text-xs text-muted-foreground">{chat.lastMessage}</p>
            </div>
            {chat.unread > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-medium text-primary-foreground">
                {chat.unread}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-2">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent",
              isActive && "bg-accent"
            )
          }
        >
          <Settings className="h-4 w-4" />
          Settings
        </NavLink>
      </div>
    </aside>
  )
}
