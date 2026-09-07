const replyPreviewLabel = (replyTo) => {
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
    reads?.find((read) => read.userId !== message.senderId)?.readAt ?? null;
  return {
    ...rest,
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
          content: replyTo.deletedAt ? null : replyTo.content,
          deleted: Boolean(replyTo.deletedAt),
          preview: replyPreviewLabel(replyTo),
        }
      : null,
  };
};
