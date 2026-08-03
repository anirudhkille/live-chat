import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Search as SearchIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useIsDesktop } from "@/hooks/use-media-query"

const MOCK_PEOPLE = [{ id: "1", name: "Priya Sharma" }, { id: "2", name: "Karan Mehta" }]
const MOCK_MESSAGES = [
  { id: "m1", chatId: "1", sender: "Priya Sharma", snippet: "Sounds good, see you then" },
]

export function SearchPage() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [query, setQuery] = useState("")

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b p-3">
        {!isDesktop && (
          <button aria-label="Back" onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="flex flex-1 items-center gap-2 rounded-md bg-muted px-2">
          <SearchIcon className="h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats and messages"
            className="border-none bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-3">
        <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">People</p>
        {MOCK_PEOPLE.map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(`/chats/${p.id}`)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
          >
            <div className="h-7 w-7 rounded-full bg-muted" />
            {p.name}
          </button>
        ))}

        <p className="mb-2 mt-4 text-[11px] uppercase tracking-wide text-muted-foreground">
          Messages
        </p>
        {MOCK_MESSAGES.map((m) => (
          <button
            key={m.id}
            onClick={() => navigate(`/chats/${m.chatId}`)}
            className="block w-full rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
          >
            <p className="font-medium">{m.sender}</p>
            <p className="text-xs text-muted-foreground">{m.snippet}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
