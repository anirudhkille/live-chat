"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/api";
import { useEditMessage } from "../hooks/useEditMessage";
import { useDeleteMessage } from "../hooks/useDeleteMessage";

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ReadReceipt({ readAt }: { readAt: string | null }) {
  if (!readAt) return null;
  return (
    <span
      className="ml-1 text-[10px] text-blue-500 dark:text-blue-400"
      title={`Seen ${formatMessageTime(readAt)}`}
    >
      ✓✓
    </span>
  );
}

export function MessageBubble({ message }: { message: Message }) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isOwn =
    message.senderId === currentUserId ||
    message.senderId === "__current_user__";
  const isOptimistic = message.id.startsWith("temp-");
  const isDeleted = Boolean(message.deletedAt);
  const isEdited =
    Boolean(message.updatedAt) && message.updatedAt > message.createdAt;

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [draftSource, setDraftSource] = useState(message.content);

  if (!isEditing && message.content !== draftSource) {
    setDraftSource(message.content);
    setDraft(message.content);
  }

  const editMutation = useEditMessage();
  const deleteMutation = useDeleteMessage();

  const beginEditing = () => {
    setIsEditing(true);
    setDraft(message.content);
  };

  const cancelEdit = () => {
    setDraft(message.content);
    setIsEditing(false);
  };

  const saveEdit = () => {
    const content = draft.trim();
    if (!content || editMutation.isPending) return;
    editMutation.mutate(
      { messageId: message.id, content },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  const handleDelete = () => {
    if (deleteMutation.isPending) return;
    if (!window.confirm("Delete this message?")) return;
    deleteMutation.mutate(message.id);
  };

  return (
    <div
      className={cn(
        "animate-message-in group relative mb-3 flex max-w-[75%] w-fit flex-col gap-0.5 rounded-md px-3 py-2 text-sm",
        isOwn ? "bg-primary text-primary-foreground ml-auto" : "bg-muted",
        isOptimistic && "opacity-70"
      )}
    >
      {isOwn && !isDeleted && (
        <div className="absolute -top-4 right-0 z-10 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={beginEditing}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Edit message"
            title="Edit message"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-red-500/20 hover:text-red-500"
            aria-label="Delete message"
            title="Delete message"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      )}

      {isDeleted ? (
        <p className="text-[13px] italic opacity-60">
          {"This message was deleted"}
        </p>
      ) : isEditing ? (
        <div className="flex flex-col gap-1">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                saveEdit();
              }
            }}
            className={cn(
              "resize-none rounded-sm border bg-background p-1.5 text-sm text-foreground outline-none",
              "focus:border-primary focus:ring-1 focus:ring-primary"
            )}
          />
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveEdit}
              disabled={!draft.trim() || editMutation.isPending}
              className="rounded bg-foreground px-2 py-0.5 text-xs text-background transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          {(message.attachments ?? []).map((attachment) =>
            attachment.type === "IMAGE" ? (
              <a
                key={attachment.id}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachment.url}
                  alt={attachment.fileName}
                  className="max-h-64 w-full max-w-56 rounded-md object-contain"
                />
              </a>
            ) : (
              <a
                key={attachment.id}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline"
              >
                {attachment.fileName}
              </a>
            )
          )}
          {message.content ? (
            <p className="break-words whitespace-pre-wrap">{message.content}</p>
          ) : null}
        </>
      )}

      <span
        className={cn(
          "text-[10px] leading-tight",
          isOwn ? "text-primary-foreground/70" : "text-muted-foreground/70"
        )}
      >
        {formatMessageTime(message.createdAt)}
        {isEdited && !isDeleted && (
          <span className="ml-1 text-[10px] italic opacity-80">edited</span>
        )}
        {isOwn && <ReadReceipt readAt={message.readAt} />}
      </span>
    </div>
  );
}