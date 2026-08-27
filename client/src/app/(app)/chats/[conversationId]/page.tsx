"use client";

import { use, useCallback ,useEffect} from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Info, Loader2 } from "lucide-react";
import { socket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { useSendMessage } from "@/features/conversations/hooks/useSendMessage";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useGetConversationById } from "@/features/conversations/hooks/useConversationById";

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export default function ChatThreadPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const router = useRouter();
  const isDesktop = useIsDesktop();

  const { data: conversation, isLoading: loadingConversation } =
    useGetConversationById(conversationId);
  const sendMessage = useSendMessage();

  const handleSend = useCallback(
    (content: string) => {
      sendMessage.mutate({ conversationId, content });
    },
    [sendMessage, conversationId]
  );
  
  const otherUserName = conversation?.name ?? conversation?.email ?? "Unknown";

  useEffect(()=>{
    socket.connect();
 
    socket.emit("join-conversation",conversationId)
    return()=>{
      socket.disconnect()
    }
  },[conversationId])

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
        <div className="flex min-w-0 items-center gap-2">
          <div className="bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium">
            {conversation ? (
              initials(otherUserName)
            ) : (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {loadingConversation ? "Loading..." : otherUserName}
            </p>
          </div>
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

      <MessageList conversationId={conversationId} />

      <MessageInput
        conversationId={conversationId}
        onSend={handleSend}
        disabled={sendMessage.isPending}
      />
    </div>
  );
}
