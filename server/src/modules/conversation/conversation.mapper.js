export const toConversationResponse = (conversation, userId) => {
  const otherUser = conversation.participants.find((p) => p.userId !== userId);

  const lastMessage = conversation.messages?.[0] ?? null;
  const isGroup =conversation.isGroup
  return {
    id: conversation.id,
    name: isGroup
      ? conversation.name
      : otherUser?.user?.name || null,
    photoUrl: isGroup?conversation.photoUrl:otherUser?.user?.avatar,
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
