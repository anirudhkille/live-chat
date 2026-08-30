"use client";

import { useEffect, useRef, useState } from "react";
import {
  CornerUpRight,
  CheckCheck,
  Pencil,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { Message, MessageReaction } from "@/types/api";
import { useEditMessage } from "../hooks/useEditMessage";
import { useDeleteMessage } from "../hooks/useDeleteMessage";
import { useToggleReaction } from "../hooks/useToggleReaction";

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
      className="ml-1 inline-flex items-center text-primary-foreground/80"
      title={`Seen ${formatMessageTime(readAt)}`}
    >
      <CheckCheck size={12} strokeWidth={2.5} />
    </span>
  );
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const EDIT_MAX_LENGTH = 2000;

function hasReacted(
  reactions: MessageReaction[] | undefined,
  emoji: string,
  userId: string | undefined
) {
  if (!userId) return false;
  return (reactions ?? []).some(
    (r) => r.userId === userId && r.emoji === emoji
  );
}

export function MessageBubble({
  message,
  conversationId,
  isGroup = false,
}: {
  message: Message;
  conversationId: string;
  isGroup?: boolean;
}) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const setReplyTo = useChatStore((s) => s.setReplyTo);
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
  const [quickReactOpen, setQuickReactOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  if (!isEditing && message.content !== draftSource) {
    setDraftSource(message.content);
    setDraft(message.content);
  }

  const editMutation = useEditMessage();
  const deleteMutation = useDeleteMessage();
  const toggleReaction = useToggleReaction();

  useEffect(() => {
    if (!menuOpen && !quickReactOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
        setQuickReactOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setQuickReactOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, quickReactOpen]);

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

  const handleReply = () => {
    setMenuOpen(false);
    setReplyTo(conversationId, {
      messageId: message.id,
      senderName: message.sender?.name ?? null,
      content: message.content,
      deleted: isDeleted,
    });
  };

  const handleReact = (emoji: string) => {
    setQuickReactOpen(false);
    setMenuOpen(false);
    if (toggleReaction.isPending) return;
    toggleReaction.mutate({ messageId: message.id, emoji });
  };

  const allReactions = message.reactions ?? [];
  const uniqueEmojis = [...new Set(allReactions.map((r) => r.emoji))];
  const hasImageAttachment = (message.attachments ?? []).some(
    (a) => a.type === "IMAGE"
  );

  return (
    <div
      className={cn("group relative mb-2.5 flex w-full", isOwn && "justify-end")}
    >
      <div
        className={cn(
          "relative flex max-w-[85%] items-center gap-1",
          isOwn && "flex-row-reverse"
        )}
      >
        <div className="group relative min-w-0 w-fit">
          <div
            className={cn(
              "flex flex-col gap-0.5 rounded-md px-3.5 py-2 text-sm shadow-sm",
              isOwn
                ? "rounded-br-md bg-primary text-primary-foreground"
                : "rounded-bl-md bg-muted text-foreground",
              isOptimistic && "opacity-60",
              allReactions.length > 0 &&
                cn("mb-2.5", hasImageAttachment ? "pb-5" : "pb-3")
            )}
          >
            {isOwn && menuOpen && (
              <div
                ref={menuRef}
                className="animate-in fade-in-0 zoom-in-95 absolute bottom-full right-0 z-20 mb-1.5 w-36 origin-bottom-right rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
                role="menu"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  role="menuitem"
                  onClick={beginEditing}
                  className="w-full justify-start gap-2 font-normal"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  role="menuitem"
                  onClick={confirmDelete}
                  className="w-full justify-start gap-2 font-normal text-red-500 hover:bg-red-500/10 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Delete
                </Button>
              </div>
            )}

            {isOwn && !isDeleted && !isEditing && (
              <Button
                type="button"
                variant={menuOpen ? "secondary" : "ghost"}
                size="icon"
                onClick={() => {
                  setMenuOpen((open) => !open);
                  setQuickReactOpen(false);
                }}
                className={cn(
                  "absolute -top-3 right-0 z-10 h-6 w-6 rounded-full border bg-background text-muted-foreground shadow-sm transition-opacity",
                  menuOpen
                    ? "opacity-100"
                    : "opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
                )}
                aria-label="Message options"
                title="Message options"
              >
                <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            )}

            {message.replyTo && (
              <div className="mb-0.5 flex items-start gap-1.5 rounded-md border-l-2 border-primary/40 bg-black/5 px-2 py-1 text-xs dark:bg-white/10">
                <CornerUpRight
                  className="mt-0.5 h-3 w-3 shrink-0 opacity-60"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {message.replyTo.senderName ?? "Unknown"}
                  </p>
                  <p className="truncate opacity-80">
                    {message.replyTo.deleted
                      ? "This message was deleted"
                      : message.replyTo.content || "Photo or file"}
                  </p>
                </div>
              </div>
            )}

            {isGroup && !isOwn && (
              <span className="mb-0.5 text-[10px] font-semibold text-muted-foreground">
                {message.sender?.name ?? "Unknown"}
              </span>
            )}

            {isDeleted ? (
              <p className="text-[13px] italic opacity-60">
                This message was deleted
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
                      className="block overflow-hidden rounded-xl"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={attachment.url}
                        alt={attachment.fileName}
                        className="max-h-64 w-full max-w-56 object-contain transition-transform hover:scale-[1.02]"
                      />
                    </a>
                  ) : (
                    <a
                      key={attachment.id}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline underline-offset-2 opacity-90 hover:opacity-100"
                    >
                      {attachment.fileName}
                    </a>
                  )
                )}
                {message.content ? (
                  <p className="break-words whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </p>
                ) : null}
              </>
            )}

            <span
              className={cn(
                "flex items-center gap-0.5 self-end text-[10px] leading-tight",
                isOwn ? "text-primary-foreground/70" : "text-muted-foreground/70"
              )}
            >
              {formatMessageTime(message.createdAt)}
              {isEdited && !isDeleted && (
                <span className="italic opacity-80">· edited</span>
              )}
              {isOwn && <ReadReceipt readAt={message.readAt} />}
            </span>
          </div>

          {allReactions.length > 0 && (
            <div
              className={cn(
                "absolute z-10 flex flex-wrap items-center gap-1",
                "-bottom-1",
                isOwn ? "right-0" : "left-0"
              )}
            >
              {uniqueEmojis.map((emoji) => {
                const mine = hasReacted(allReactions, emoji, currentUserId);
                const count = allReactions.filter(
                  (r) => r.emoji === emoji
                ).length;
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      if (toggleReaction.isPending) return;
                      toggleReaction.mutate({ messageId: message.id, emoji });
                    }}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] leading-none shadow-sm transition-colors",
                      mine
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border bg-background hover:bg-accent"
                    )}
                    aria-pressed={mine}
                    aria-label={`${emoji} reaction, ${count} ${count === 1 ? "person" : "people"}`}
                  >
                    <span>{emoji}</span>
                    <span className="font-medium tabular-nums">{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {!isDeleted && !isEditing && (
            <div
              className={cn(
                "absolute z-20 -top-9 flex items-center gap-0.5 rounded-full border bg-background p-1 shadow-md transition-all",
                isOwn ? "right-0" : "left-0",
                quickReactOpen
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-1 opacity-0 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100"
              )}
              role="toolbar"
              aria-label="Quick reactions"
            >
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleReact(emoji)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-base transition-transform hover:scale-125 hover:bg-accent",
                    hasReacted(allReactions, emoji, currentUserId) &&
                      "bg-accent"
                  )}
                  aria-label={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {!isDeleted && !isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleReply}
            className="h-7 w-7 shrink-0 rounded-full text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            aria-label="Reply"
            title="Reply"
          >
            <CornerUpRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>

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
              disabled={
                !draft.trim() ||
                draft.trim() === message.content ||
                editMutation.isPending
              }
            >
              {editMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-1.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, EDIT_MAX_LENGTH))}
            rows={4}
            autoFocus
            maxLength={EDIT_MAX_LENGTH}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                saveEdit();
              }
            }}
            className="w-full resize-none rounded-md border bg-background p-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Enter to save · Shift + Enter for a new line</span>
            <span className="tabular-nums">
              {draft.length}/{EDIT_MAX_LENGTH}
            </span>
          </div>
        </div>
      </Dialog>
    </div>
  );
}