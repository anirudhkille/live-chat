"use client";

import { useCallback, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Paperclip, Send } from "lucide-react";

import { useChatStore } from "@/store/chat-store";

type MessageInputProps = {
  conversationId: string;
  onSend: (content: string) => void;
  disabled?: boolean;
};

export function MessageInput({
  conversationId,
  onSend,
  disabled,
}: MessageInputProps) {
  const draft = useChatStore((s) => s.drafts[conversationId] ?? "");
  const setDraft = useChatStore((s) => s.setDraft);
  const clearDraft = useChatStore((s) => s.clearDraft);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as content grows
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  }, [draft]);

  const handleSend = useCallback(() => {
    const content = draft.trim();
    if (!content || disabled) return;
    onSend(content);
    clearDraft(conversationId);
  }, [draft, disabled, onSend, clearDraft, conversationId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

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
        disabled={disabled}
        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex max-h-37.5 min-h-10 flex-1 resize-none rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Button
        type="submit"
        size="icon"
        aria-label="Send message"
        disabled={!draft.trim() || disabled}
        className="shrink-0"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
