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
        }
      : null,
  };
};
