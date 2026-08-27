export const toConversationResponse = (conversation, userId) => {
  const otherUser = conversation.participants.find((p) => p.userId !== userId);

  const lastMessage = conversation.messages?.[0] ?? null;
  return {
    id: conversation.id,
    name: conversation.isGroup
      ? conversation.name
      : otherUser?.user?.name || null,
    photoUrl: conversation.photoUrl,
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          content: lastMessage.content,
          createdAt: lastMessage.createdAt,
          sender: lastMessage.sender,
        }
      : null,
  };
};
