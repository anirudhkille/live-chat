"use client";

import { useCallback, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Paperclip, Send } from "lucide-react";
import { socket } from "@/lib/socket";
import { useChatStore } from "@/store/chat-store";
import { useSendMessage } from "@/features/conversations/hooks/useSendMessage";

const TYPING_THROTTLE_MS = 2000;
const TYPING_STOP_DELAY_MS = 1500;

type MessageInputProps = {
  conversationId: string;
};

export function MessageInput({ conversationId }: MessageInputProps) {
  const draft = useChatStore((s) => s.drafts[conversationId] ?? "");
  const setDraft = useChatStore((s) => s.setDraft);
  const clearDraft = useChatStore((s) => s.clearDraft);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendMessage = useSendMessage();
  const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const lastTypingEmitAtRef = useRef(0);

  // Auto-resize textarea as content grows
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  }, [draft]);

  // Notify the room that the user is typing (with auto-stop)
  useEffect(() => {
    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }

    if (draft.trim()) {
      const now = Date.now();
      if (now - lastTypingEmitAtRef.current >= TYPING_THROTTLE_MS) {
        socket.emit("typing-conversation", { conversationId, isTyping: true });
        lastTypingEmitAtRef.current = now;
      }
      typingStopTimeoutRef.current = setTimeout(() => {
        socket.emit("typing-conversation", { conversationId, isTyping: false });
      }, TYPING_STOP_DELAY_MS);
    } else {
      socket.emit("typing-conversation", { conversationId, isTyping: false });
    }
  }, [draft, conversationId]);

  useEffect(() => {
    return () => {
      socket.emit("typing-conversation", { conversationId, isTyping: false });
    };
  }, [conversationId]);

  const handleSend = useCallback(() => {
    const content = draft.trim();
    if (!content || sendMessage.isPending) return;
    sendMessage.mutate({ conversationId, content });
    clearDraft(conversationId);
  }, [draft, sendMessage, conversationId, clearDraft]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  useEffect(()=>{
      socket.on("typing-conversation", (conversationId) => {
 socket.emit(`conversation:${conversationId}`, conversationId);
})
  },[])

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSend();
      }}
      className="flex items-end gap-2 border-t p-3"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Attach file"
        disabled
        className="shrink-0"
      >
        <Paperclip className="h-4 w-4" />
      </Button>
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(conversationId, e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message"
        rows={1}
        disabled={sendMessage.isPending}
        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex max-h-37.5 min-h-10 flex-1 resize-none rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Button
        type="submit"
        size="icon"
        aria-label="Send message"
        disabled={!draft.trim() || sendMessage.isPending}
        className="shrink-0"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}