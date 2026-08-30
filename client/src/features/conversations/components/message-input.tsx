"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, Paperclip, Send, X } from "lucide-react";
import { socket } from "@/lib/socket";
import { useChatStore } from "@/store/chat-store";
import { useSendMessage } from "@/features/conversations/hooks/useSendMessage";
import {
  uploadAttachment,
  validateAttachmentFile,
} from "@/features/attachments/api/attachment-api";

const TYPING_THROTTLE_MS = 2000;
const TYPING_STOP_DELAY_MS = 1500;
const MAX_PENDING_ATTACHMENTS = 4;

type MessageInputProps = {
  conversationId: string;
};

type PendingAttachment = {
  localId: string;
  file: File;
  previewUrl: string;
  attachmentId: string | null;
  status: "uploading" | "ready" | "error";
};

export function MessageInput({ conversationId }: MessageInputProps) {
  const draft = useChatStore((s) => s.drafts[conversationId] ?? "");
  const setDraft = useChatStore((s) => s.setDraft);
  const clearDraft = useChatStore((s) => s.clearDraft);
  const replyTo = useChatStore((s) => s.replies[conversationId] ?? null);
  const setReplyTo = useChatStore((s) => s.setReplyTo);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const revokeOnUnmountRef = useRef<string[]>([]);
  const sendMessage = useSendMessage();
  const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const lastTypingEmitAtRef = useRef(0);

  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const isUploading = pending.some((p) => p.status === "uploading");
  const readyAttachmentIds = pending
    .filter((p) => p.status === "ready" && p.attachmentId)
    .map((p) => p.attachmentId as string);

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

  useEffect(() => {
    return () => {
      revokeOnUnmountRef.current.forEach((url) => URL.revokeObjectURL(url));
      revokeOnUnmountRef.current = [];
    };
  }, []);

  const startAttachmentUploads = useCallback(
    (files: File[]) => {
      const remaining = Math.max(
        0,
        MAX_PENDING_ATTACHMENTS - pending.length
      );

      files.slice(0, remaining).forEach((file) => {
        const previewUrl = URL.createObjectURL(file);
        revokeOnUnmountRef.current.push(previewUrl);
        const localId = crypto.randomUUID();
        setPending((prev) => [
          ...prev,
          { localId, file, previewUrl, attachmentId: null, status: "uploading" },
        ]);

        uploadAttachment(file)
          .then((attachment) =>
            setPending((prev) =>
              prev.map((item) =>
                item.localId === localId
                  ? { ...item, attachmentId: attachment.id, status: "ready" }
                  : item
              )
            )
          )
          .catch(() =>
            setPending((prev) =>
              prev.map((item) =>
                item.localId === localId ? { ...item, status: "error" } : item
              )
            )
          );
      });
    },
    [pending.length]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      const list = Array.from(files);
      const invalid = list.find(
        (file) => !!validateAttachmentFile(file)
      );
      setPickerError(invalid ? validateAttachmentFile(invalid) : null);
      startAttachmentUploads(
        list.filter((file) => !validateAttachmentFile(file))
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [startAttachmentUploads]
  );

  const removePending = useCallback(
    (localId: string) => {
      const item = pending.find((p) => p.localId === localId);
      if (item) URL.revokeObjectURL(item.previewUrl);
      setPending((prev) => prev.filter((p) => p.localId !== localId));
    },
    [pending]
  );

  const handleSend = useCallback(() => {
    const content = draft.trim();
    if (
      (!content && readyAttachmentIds.length === 0) ||
      sendMessage.isPending ||
      isUploading
    ) {
      return;
    }
    sendMessage.mutate({
      conversationId,
      content,
      attachmentIds: readyAttachmentIds,
      ...(replyTo ? { replyToId: replyTo.messageId } : {}),
    });
    clearDraft(conversationId);
    if (replyTo) setReplyTo(conversationId, null);
    if (pending.length) {
      pending.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setPending([]);
    }
  }, [
    draft,
    pending,
    readyAttachmentIds,
    isUploading,
    sendMessage,
    conversationId,
    clearDraft,
    replyTo,
    setReplyTo,
  ]);

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
    <div className="border-t">
      {pending.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 pb-0">
          {pending.map((item) => (
            <div key={item.localId} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.previewUrl}
                alt={item.file.name}
                className="bg-muted h-16 w-16 rounded-md object-cover"
              />
              {item.status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                </div>
              )}
              {item.status === "error" && (
                <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                </div>
              )}
              <button
                type="button"
                aria-label={`Remove ${item.file.name}`}
                onClick={() => removePending(item.localId)}
                className="bg-background border-muted-foreground/30 text-muted-foreground absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full border"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {pickerError && (
        <p className="text-destructive px-3 pt-2 text-[11px]">{pickerError}</p>
      )}
      {replyTo && (
        <div className="border-input/60 mx-3 mt-2 flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-1.5">
          <button
            type="button"
            aria-label="Cancel reply"
            onClick={() => setReplyTo(conversationId, null)}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="min-w-0 flex-1 truncate text-xs">
            <span className="font-medium">
              Replying to {replyTo.senderName ?? "Unknown"}
            </span>
            <span className="text-muted-foreground ml-1 truncate">
              {replyTo.deleted
                ? "This message was deleted"
                : replyTo.content || "Photo or file"}
            </span>
          </div>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-end gap-2 p-3"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Add image"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
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
          disabled={
            (!draft.trim() && readyAttachmentIds.length === 0) ||
            sendMessage.isPending ||
            isUploading
          }
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}