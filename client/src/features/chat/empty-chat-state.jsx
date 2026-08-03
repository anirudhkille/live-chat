import { MessageCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"

export function EmptyChatState() {
  const navigate = useNavigate()
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <MessageCircle className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">Start your first chat</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Find a contact and send your first message.
        </p>
      </div>
      <Button size="sm" onClick={() => navigate("/chats/new")}>
        New chat
      </Button>
    </div>
  )
}
