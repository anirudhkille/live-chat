"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Info, MessageSquareOff, Paperclip, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useIsDesktop } from "@/hooks/use-media-query"

export default function ChatThreadPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = use(params)
  const router = useRouter()
  const isDesktop = useIsDesktop()

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b p-3">
        {!isDesktop && (
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.push("/chats")}
            className="p-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">Conversation</p>
          <p
            className="truncate text-xs text-muted-foreground"
            title={conversationId}
          >
            {conversationId}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          aria-label="Chat info"
          disabled
        >
          <Info className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
        <MessageSquareOff className="h-8 w-8" />
        <p className="text-sm">Messaging isn&apos;t connected yet</p>
        <p className="max-w-xs text-xs">
          Messages will load here once the conversations and messages API is
          available.
        </p>
      </div>

      <form
        aria-hidden="true"
        onSubmit={(event) => event.preventDefault()}
        className="flex items-center gap-2 border-t p-3 opacity-50"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Attach file"
          disabled
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Input placeholder="Message" disabled className="flex-1" />
        <Button type="submit" size="icon" aria-label="Send message" disabled>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
