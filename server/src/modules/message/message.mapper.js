const isEncrypted = (message) =>
  message?.cipherMeta != null &&
  !(
    typeof message.cipherMeta === "object" &&
    Object.keys(message.cipherMeta).length === 0
  );

const replyPreviewLabel = (replyTo) => {
  if (replyTo.deletedAt) return "Message deleted";
  if (isEncrypted(replyTo)) return "Encrypted message";
  if (replyTo.content?.trim()) return replyTo.content;
  const attachments = replyTo.attachments ?? [];
  if (attachments.length > 0 && attachments.every((a) => a.type === "AUDIO")) {
    return "Voice message";
  }
  if (attachments.length > 0) return "Photo or file";
  return "";
};

export const toMessageResponse = (message) => {
  const { reads, reactions, replyTo, ...rest } = message;
  const readAt =
    reads?.find(
      (read) =>
        read.userId !== message.senderId && read.user?.readReceipts !== false,
    )?.readAt ?? null;
  const { content, attachments, ...restWithoutContent } = rest;
  const deleted = Boolean(message.deletedAt);
  return {
    ...restWithoutContent,
    content: deleted ? null : content,
    attachments: deleted ? [] : (attachments ?? []),
    readAt,
    reactions: (reactions ?? []).map((reaction) => ({
      id: reaction.id,
      emoji: reaction.emoji,
      userId: reaction.userId,
      user: reaction.user,
    })),
    replyTo: replyTo
      ? {
          id: replyTo.id,
          senderId: replyTo.senderId,
          senderName: replyTo.sender?.name ?? null,
          content:
            replyTo.deletedAt || isEncrypted(replyTo) ? null : replyTo.content,
          deleted: Boolean(replyTo.deletedAt),
          encrypted: isEncrypted(replyTo),
          preview: replyPreviewLabel(replyTo),
        }
      : null,
  };
};

/**
 * Mask the preview of a conversation's last message. Deleted and encrypted
 * messages must not leak their stored content.
 */
export const toLastMessagePreview = (lastMessage) => {
  if (!lastMessage) return null;
  return {
    id: lastMessage.id,
    content:
      lastMessage.deletedAt || isEncrypted(lastMessage)
        ? null
        : lastMessage.content,
    createdAt: lastMessage.createdAt,
    sender: lastMessage.sender ?? null,
  };
};
