"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
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

export function MessageBubble({
  message,
  isGroup = false,
}: {
  message: Message;
  isGroup?: boolean;
}) {
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  if (!isEditing && message.content !== draftSource) {
    setDraftSource(message.content);
    setDraft(message.content);
  }

  const editMutation = useEditMessage();
  const deleteMutation = useDeleteMessage();

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const beginEditing = () => {
    setMenuOpen(false);
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

  const confirmDelete = () => {
    setMenuOpen(false);
    if (deleteMutation.isPending) return;
    toast("Delete this message?", {
      description: "This can't be undone.",
      cancel: {
        label: "Cancel",
        onClick: () => toast.dismiss(),
      },
      action: {
        label: "Delete",
        onClick: () => deleteMutation.mutate(message.id),
      },
    });
  };

  return (
    <div
      className={cn(
        "animate-message-in group relative mb-3 flex max-w-[75%] w-fit flex-col gap-0.5 rounded-md px-3 py-2 text-sm",
        isOwn ? "bg-primary text-primary-foreground ml-auto" : "bg-muted",
        isOptimistic && "opacity-70"
      )}
    >
      {isOwn && !isDeleted && !isEditing && (
        <div className="absolute -top-4 right-0 z-20 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            variant={menuOpen ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setMenuOpen((open) => !open)}
            className="h-7 w-7"
            aria-label="Message options"
            title="Message options"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
            </svg>
          </Button>

          {menuOpen && (
            <div
              ref={menuRef}
              className="absolute right-0 top-full z-20 mt-1 w-40 rounded-md border bg-background p-1 shadow-lg"
              role="menu"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                role="menuitem"
                onClick={beginEditing}
                className="w-full justify-start"
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                role="menuitem"
                onClick={confirmDelete}
                className="w-full justify-start text-red-500 hover:bg-red-500/10 hover:text-red-500"
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete
              </Button>
            </div>
          )}
        </div>
      )}

      {isGroup && !isOwn && (
        <span className="text-muted-foreground mb-0.5 text-[10px] font-medium">
          {message.sender?.name ?? "Unknown"}
        </span>
      )}

      {isDeleted ? (
        <p className="text-[13px] italic opacity-60">
          {"This message was deleted"}
        </p>
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

      <Dialog
        open={isEditing}
        onClose={cancelEdit}
        title="Edit message"
        footer={
          <>
            <Button variant="ghost" onClick={cancelEdit}>
              Cancel
            </Button>
            <Button
              onClick={saveEdit}
              disabled={!draft.trim() || editMutation.isPending}
            >
              Save
            </Button>
          </>
        }
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              saveEdit();
            }
          }}
          className="w-full resize-none rounded-md border bg-background p-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </Dialog>

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