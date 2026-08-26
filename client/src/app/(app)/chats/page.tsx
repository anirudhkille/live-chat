import { MessageCircle } from "lucide-react"

export default function ChatsIndexPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
      <MessageCircle className="h-8 w-8" />
      <p className="text-sm">Select a chat to start messaging</p>
    </div>
  )
}
