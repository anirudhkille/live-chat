import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Send, Paperclip, Info } from "lucide-react"
import { useIsDesktop } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChatInfoPanel } from "@/features/chat/chat-info-panel"

const MOCK_MESSAGES = [
  { id: "m1", from: "them", text: "Hey, are we still on for the demo?", sender: "Priya" },
  { id: "m2", from: "me", text: "Yes, 3pm works for me" },
  { id: "m3", from: "them", text: "Sounds good, see you then", sender: "Priya" },
]

export function ChatThreadPage() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [infoOpen, setInfoOpen] = useState(false)
  const [draft, setDraft] = useState("")

  function handleSend(e) {
    e.preventDefault()
    if (!draft.trim()) return
    setDraft("")
  }

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b p-3">
          {!isDesktop && (
            <button aria-label="Back" onClick={() => navigate("/chats")} className="p-1">
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setInfoOpen(true)}
            className="flex min-w-0 items-center gap-2 text-left"
          >
            <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                Conversation {conversationId}
              </p>
              <p className="text-xs text-green-600">Online</p>
            </div>
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            aria-label="Chat info"
            onClick={() => setInfoOpen(true)}
          >
            <Info className="h-4 w-4" />
          </Button>
        </header>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {MOCK_MESSAGES.map((m) => (
            <div
              key={m.id}
              className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                m.from === "me"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {m.text}
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="flex items-center gap-2 border-t p-3">
          <Button type="button" variant="ghost" size="icon" aria-label="Attach file">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message"
            className="flex-1"
          />
          <Button type="submit" size="icon" aria-label="Send message">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {isDesktop && infoOpen && (
        <ChatInfoPanel conversationId={conversationId} onClose={() => setInfoOpen(false)} inline />
      )}
      {!isDesktop && infoOpen && (
        <ChatInfoPanel conversationId={conversationId} onClose={() => setInfoOpen(false)} />
      )}
    </div>
  )
}
