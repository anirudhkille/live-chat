"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  CornerUpRight,
  CheckCheck,
  Pencil,
  Trash2,
  MoreHorizontal,
  Smile,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import { cn } from "@/lib/utils";
import { formatMessageTime } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { Attachment, MessageReaction } from "@/types/api";
import { useE2EIdentity } from "@/features/e2e/hooks/useE2EIdentity";
import type { DisplayMessage } from "@/features/e2e/hooks/useDecryptedMessages";
import {
  usePeerPublicKey,
  usePeerPublicKeys,
} from "@/features/e2e/hooks/usePeerPublicKey";
import { deriveConversationKey } from "@/lib/crypto/conversationKey";
import { encryptGroupMessage, encryptMessage } from "@/lib/crypto/messaging";
import { getEncryptionReadiness } from "../lib/message-encryption";
import { useEditMessage } from "../hooks/useEditMessage";
import { useDeleteMessage } from "../hooks/useDeleteMessage";
import { useToggleReaction } from "../hooks/useToggleReaction";

function ReadReceipt({ readAt }: { readAt: string | null }) {
  if (!readAt) return null;
  return (
    <span
      className="text-primary-foreground/80 ml-1 inline-flex items-center"
      title={`Seen ${formatMessageTime(readAt)}`}
    >
      <CheckCheck size={12} strokeWidth={2.5} />
    </span>
  );
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const EDIT_MAX_LENGTH = 2000;

function attachmentPreviewLabel(
  content: string | null,
  attachments: Attachment[] | undefined
): string {
  if (content?.trim()) return content;
  const audioOnly =
    (attachments?.length ?? 0) > 0 &&
    (attachments ?? []).every((a) => a.type === "AUDIO");
  if (audioOnly) return "Voice message";
  if ((attachments?.length ?? 0) > 0) return "Photo or file";
  return "";
}

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

export const MessageBubble = memo(function MessageBubble({
  message,
  conversationId,
  isGroup = false,
  participantIds,
}: {
  message: DisplayMessage;
  conversationId: string;
  isGroup?: boolean;
  participantIds?: string[];
}) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const setReplyTo = useChatStore((s) => s.setReplyTo);
  const isOwn = message.senderId === currentUserId;
  const isOptimistic = message.id.startsWith("temp-");
  const isDeleted = Boolean(message.deletedAt);
  const isEdited =
    Boolean(message.updatedAt) && message.updatedAt > message.createdAt;

  const { keys } = useE2EIdentity();
  const isEncryptedMessage = Boolean(message.cipherMeta);
  const editPeerId = !isGroup
    ? message.senderId === currentUserId
      ? message.receiverId
      : message.senderId
    : null;
  const { data: editPeerPublicKey } = usePeerPublicKey(
    isEncryptedMessage ? editPeerId : null
  );
  const groupKeyIds = useMemo(
    () =>
      isGroup && isEncryptedMessage
        ? (participantIds ?? []).filter((id) => id !== currentUserId)
        : [],
    [isGroup, isEncryptedMessage, participantIds, currentUserId]
  );
  const { publicKeys: editGroupPublicKeys } = usePeerPublicKeys(groupKeyIds);
  const editReadiness = useMemo(
    () =>
      getEncryptionReadiness({
        isGroup,
        hasKeys: !!keys,
        currentUserId: currentUserId ?? null,
        peerPublicKey: editPeerPublicKey,
        participantIds,
        groupPublicKeys: editGroupPublicKeys,
      }),
    [
      isGroup,
      keys,
      currentUserId,
      editPeerPublicKey,
      participantIds,
      editGroupPublicKeys,
    ]
  );
  const canEncryptEdit = !isEncryptedMessage || editReadiness.ready;
  const editEncryptionNotice =
    "Encryption keys are unavailable for some group members. Try again once their keys have loaded.";

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [editError, setEditError] = useState<string | null>(null);
  const [activePopover, setActivePopover] = useState<"react" | "menu" | null>(
    null
  );
  const rootRef = useRef<HTMLDivElement>(null);

  const editMutation = useEditMessage();
  const deleteMutation = useDeleteMessage();
  const toggleReaction = useToggleReaction();

  useEffect(() => {
    if (!activePopover) return;
    const close = (event: MouseEvent | TouchEvent | KeyboardEvent) => {
      if ("key" in event) {
        if (event.key === "Escape") setActivePopover(null);
        return;
      }
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setActivePopover(null);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
      document.removeEventListener("keydown", close);
    };
  }, [activePopover]);

  const beginEditing = () => {
    if (!canEncryptEdit) return;
    setActivePopover(null);
    setEditError(null);
    setDraft(message.content);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraft(message.content);
    setEditError(null);
    setIsEditing(false);
  };

  const saveEdit = async () => {
    const trimmed = draft.trim();
    if (!trimmed || editMutation.isPending) return;
    if (!canEncryptEdit) {
      setEditError(editEncryptionNotice);
      return;
    }

    let content = trimmed;
    let cipherMeta: Record<string, unknown> | undefined;

    if (isEncryptedMessage) {
      try {
        if (isGroup) {
          if (!keys || !currentUserId) {
            setEditError(editEncryptionNotice);
            return;
          }
          const encrypted = await encryptGroupMessage({
            privateKey: keys.privateKey,
            conversationId,
            currentUserId,
            plaintext: trimmed,
            recipientPublicKeys: {
              ...editGroupPublicKeys,
              [currentUserId]: keys.publicKey,
            },
            requiredRecipientIds: editReadiness.requiredIds,
          });
          if (!encrypted) {
            setEditError(editEncryptionNotice);
            return;
          }
          content = encrypted.content;
          cipherMeta = encrypted.cipherMeta;
        } else {
          if (!keys || !editPeerPublicKey) {
            setEditError(
              "Encryption keys are unavailable. Try again in a moment."
            );
            return;
          }
          const conversationKey = deriveConversationKey({
            privateKey: keys.privateKey,
            peerPublicKey: editPeerPublicKey,
            conversationId,
          });
          const encrypted = await encryptMessage(conversationKey, trimmed);
          content = encrypted.content;
          cipherMeta = encrypted.cipherMeta;
        }
      } catch {
        setEditError("Couldn't encrypt the edited message. Please try again.");
        return;
      }
    }

    setEditError(null);
    editMutation.mutate(
      { messageId: message.id, content, cipherMeta },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  const confirmDelete = () => {
    setActivePopover(null);
    if (deleteMutation.isPending) return;
    toast("Delete this message?", {
      description: "This can't be undone.",
      cancel: { label: "Cancel", onClick: () => toast.dismiss() },
      action: {
        label: "Delete",
        onClick: () => deleteMutation.mutate(message.id),
      },
    });
  };

  const handleReply = () => {
    setActivePopover(null);
    setReplyTo(conversationId, {
      messageId: message.id,
      senderName: message.sender?.name ?? null,
      content: message.content,
      deleted: isDeleted,
      preview: attachmentPreviewLabel(message.content, message.attachments),
    });
  };

  const handleReact = (emoji: string) => {
    setActivePopover(null);
    if (toggleReaction.isPending) return;
    toggleReaction.mutate({ messageId: message.id, emoji });
  };

  const { allReactions, uniqueEmojis, myReaction } = useMemo(() => {
    const list = message.reactions ?? [];
    return {
      allReactions: list,
      uniqueEmojis: [...new Set(list.map((r) => r.emoji))],
      myReaction: list.find((r) => r.userId === currentUserId)?.emoji,
    };
  }, [message.reactions, currentUserId]);

  const showToolbar = !isDeleted && !isEditing;

  return (
    <div
      ref={rootRef}
      className={cn(
        "group/row relative mb-3 flex w-full items-center gap-1",
        isOwn ? "flex-row-reverse justify-start" : "justify-start"
      )}
    >
      <div
        className={cn(
          "relative flex max-w-[80%] flex-col sm:max-w-[75%]",
          isOwn && "items-end"
        )}
      >
        {activePopover === "react" && (
          <div className="bg-background text-foreground absolute bottom-full z-20 mb-1 flex items-center gap-0.5 rounded-md border p-1 shadow-lg">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleReact(emoji)}
                className={cn(
                  "hover:bg-accent focus-visible:ring-ring flex h-7 w-7 items-center justify-center rounded-md text-base transition-transform duration-150 ease-out hover:scale-110 focus-visible:ring-2 active:scale-[0.98]",
                  myReaction === emoji && "bg-accent"
                )}
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {activePopover === "menu" && isOwn && (
          <div
            className="bg-popover text-popover-foreground absolute right-0 bottom-full z-20 mb-1 w-48 origin-bottom-right rounded-lg border p-1 shadow-lg"
            role="menu"
          >
            <Button
              variant="ghost"
              size="sm"
              role="menuitem"
              onClick={beginEditing}
              disabled={!canEncryptEdit}
              title={canEncryptEdit ? undefined : editEncryptionNotice}
              className="w-full justify-start gap-2 font-normal"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </Button>
            {!canEncryptEdit && (
              <p className="text-muted-foreground px-2 py-1 text-[10px] leading-snug">
                {editEncryptionNotice}
              </p>
            )}
            <Button
              variant="ghost"
              size="sm"
              role="menuitem"
              onClick={confirmDelete}
              className="text-destructive hover:bg-destructive/10 w-full justify-start gap-2 font-normal"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Delete
            </Button>
          </div>
        )}

        <div
          className={cn(
            "relative flex w-fit flex-col gap-1 rounded-lg px-3.5 py-2 text-sm shadow-sm",
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm",
            isOptimistic && "opacity-60",
            allReactions.length > 0 && "mb-3"
          )}
        >
          {message.replyTo && (
            <div className="border-primary/40 mb-0.5 flex items-start gap-1.5 rounded-md border-l-2 bg-black/5 px-2 py-1 text-xs dark:bg-white/10">
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
                    : message.replyTo.preview ||
                      message.replyTo.content ||
                      "Photo or file"}
                </p>
              </div>
            </div>
          )}

          {isGroup && !isOwn && (
            <span className="text-muted-foreground mb-0.5 text-[10px] font-semibold">
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
                    className="bg-muted block overflow-hidden rounded-lg"
                    style={{
                      aspectRatio:
                        attachment.width && attachment.height
                          ? `${attachment.width}/${attachment.height}`
                          : "1/1",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={attachment.url}
                      alt={attachment.fileName}
                      width={attachment.width ?? 224}
                      height={attachment.height ?? 224}
                      loading="lazy"
                      decoding="async"
                      className="max-h-64 w-full max-w-56 object-contain transition-transform hover:scale-[1.02]"
                    />
                  </a>
                ) : attachment.type === "AUDIO" ? (
                  <audio
                    key={attachment.id}
                    controls
                    preload="metadata"
                    src={attachment.url}
                    className="my-0.5 h-10 w-56 max-w-full"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <a
                    key={attachment.id}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline underline-offset-2 opacity-90 hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {attachment.fileName}
                  </a>
                )
              )}
              {message.decryptionError ? (
                <p className="text-[13px] leading-relaxed italic opacity-70">
                  {message.decryptionError === "keys-unavailable"
                    ? "Encryption keys unavailable"
                    : "Unable to decrypt"}
                </p>
              ) : message.content ? (
                <p className="leading-relaxed break-words whitespace-pre-wrap">
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
            {keys && !message.cipherMeta && !isDeleted && (
              <span
                className="ml-1 rounded-sm border px-1 text-[9px] font-medium opacity-70"
                title="This message was sent without end-to-end encryption"
              >
                Not encrypted
              </span>
            )}
            {isEdited && !isDeleted && (
              <span className="italic opacity-80">· edited</span>
            )}
            {isOwn && <ReadReceipt readAt={message.readAt} />}
          </span>
        </div>

        {allReactions.length > 0 && (
          <div
            className={cn(
              "-mt-2 flex flex-wrap items-center gap-1",
              isOwn ? "self-end pr-1" : "self-start pl-1"
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReact(emoji);
                  }}
                  className={cn(
                    "bg-background hover:bg-accent flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] leading-none shadow transition-colors duration-150 ease-out",
                    mine
                      ? "border-primary/40 text-foreground ring-primary/50 ring-1"
                      : "border-border text-foreground"
                  )}
                  aria-pressed={mine}
                  aria-label={`${emoji} reaction, ${count} ${count === 1 ? "person" : "people"}`}
                >
                  <span>{emoji}</span>
                  {count > 1 && (
                    <span className="font-medium tabular-nums">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showToolbar && (
        <div
          className={cn(
            "flex items-center gap-0.5",
            isOwn ? "flex-row-reverse" : "flex-row"
          )}
        >
          <button
            type="button"
            onClick={handleReply}
            className="text-muted-foreground hover:bg-accent focus-visible:ring-ring flex h-7 w-7 items-center justify-center rounded-md transition-transform duration-150 ease-out focus-visible:ring-2 active:scale-[0.98]"
            aria-label="Reply"
          >
            <CornerUpRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActivePopover((p) => (p === "react" ? null : "react"));
            }}
            className="text-muted-foreground hover:bg-accent focus-visible:ring-ring flex h-7 w-7 items-center justify-center rounded-md opacity-100 transition-opacity duration-150 ease-out focus-visible:ring-2 active:scale-[0.98] md:opacity-0 md:group-hover/row:opacity-100"
            aria-label="React"
          >
            <Smile className="h-4 w-4" />
          </button>
          {isOwn && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActivePopover((p) => (p === "menu" ? null : "menu"));
              }}
              className="text-muted-foreground hover:bg-accent focus-visible:ring-ring flex h-7 w-7 items-center justify-center rounded-md opacity-100 transition-opacity duration-150 ease-out focus-visible:ring-2 active:scale-[0.98] md:opacity-0 md:group-hover/row:opacity-100"
              aria-label="More options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          )}
        </div>
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
              disabled={
                !canEncryptEdit ||
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
          {editError && <p className="text-destructive text-xs">{editError}</p>}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, EDIT_MAX_LENGTH))}
            rows={4}
            autoFocus
            maxLength={EDIT_MAX_LENGTH}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                saveEdit();
              }
            }}
            className="bg-background text-foreground focus:border-primary focus:ring-primary w-full resize-none rounded-md border p-2.5 text-sm transition-colors outline-none focus:ring-1"
          />
          <div className="text-muted-foreground flex items-center justify-between text-[11px]">
            <span>Enter to save · Shift + Enter for a new line</span>
            <span className="tabular-nums">
              {draft.length}/{EDIT_MAX_LENGTH}
            </span>
          </div>
        </div>
      </Dialog>
    </div>
  );
});
