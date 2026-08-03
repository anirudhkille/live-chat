import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useIsDesktop } from "@/hooks/use-media-query"

const MOCK_CONTACTS = [
  { id: "u1", name: "Priya Sharma" },
  { id: "u2", name: "Karan Mehta" },
  { id: "u3", name: "Sana Iqbal" },
  { id: "u4", name: "Vikram Rao" },
]

export function NewChatPage() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [query, setQuery] = useState("")

  const filtered = MOCK_CONTACTS.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  )

  function startChat(contactId) {
    navigate(`/chats/${contactId}`)
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b p-3">
        {!isDesktop && (
          <button aria-label="Back" onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <span className="text-sm font-medium">New chat</span>
      </header>

      <div className="p-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.map((contact) => (
          <button
            key={contact.id}
            onClick={() => startChat(contact.id)}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent"
          >
            <div className="h-9 w-9 rounded-full bg-muted" />
            {contact.name}
          </button>
        ))}
      </div>

      <button
        onClick={() => navigate("/chats/new/group")}
        className="flex items-center justify-center gap-2 border-t p-3 text-sm text-primary hover:bg-accent"
      >
        <Users className="h-4 w-4" />
        Create group
      </button>
    </div>
  )
}
