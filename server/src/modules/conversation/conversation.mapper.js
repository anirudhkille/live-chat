export const toParticipants = (participants) =>
  (participants ?? []).map((p) => ({
    id: p.userId,
    name: p.user.name,
    avatar: p.user.avatar,
    email: p.user.email,
  }));

export const toConversationResponse = (conversation, userId) => {
  const lastMessage = conversation.messages?.[0] ?? null;
  const isGroup = conversation.isGroup;
  const otherUser = conversation.participants.find((p) => p.userId !== userId);
  return {
    id: conversation.id,
    isGroup,
    name: isGroup ? conversation.name : otherUser?.user?.name || null,
    photoUrl: isGroup ? conversation.photoUrl : otherUser?.user?.avatar,
    email: isGroup ? null : (otherUser?.user?.email ?? null),
    otherUserId: otherUser?.userId ?? null,
    unreadCount: conversation._unreadCount ?? 0,
    participants: isGroup ? toParticipants(conversation.participants) : [],
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
