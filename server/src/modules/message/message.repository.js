import { prisma } from "../../config/prisma.js";

export const withDetails = {
  include: {
    attachments: true,
    reads: { take: 1, orderBy: { readAt: "desc" } },
    reactions: {
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
    replyTo: {
      include: {
        attachments: true,
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
  },
};

export const findById = (messageId) => {
  return prisma.message.findUnique({
    where: { id: messageId },
    ...withDetails,
  });
};

export const findInConversationForUser = (messageId, userId) => {
  return prisma.message.findFirst({
    where: {
      id: messageId,
      conversation: { participants: { some: { userId } } },
    },
    ...withDetails,
  });
};

export const getMessages = (conversationId, before, limit) => {
  return prisma.message.findMany({
    where: {
      conversationId,
      ...(before ? { createdAt: { lt: before } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...withDetails,
  });
};

export const updateMessage = (messageId, content) => {
  return prisma.message.update({
    where: { id: messageId },
    data: { content },
    ...withDetails,
  });
};

export const deleteMessage = (messageId) => {
  return prisma.message.update({
    where: { id: messageId },
    data: { deletedAt: new Date() },
    ...withDetails,
  });
};

export const markMessagesRead = async (conversationId, userId) => {
  return prisma.$transaction(async (tx) => {
    const messages = await tx.message.findMany({
      where: {
        conversationId,
        senderId: { not: userId },
        reads: { none: { userId } },
      },
      select: { id: true },
    });
    if (messages.length === 0) return 0;

    const readAt = new Date();
    await tx.messageRead.createMany({
      data: messages.map((message) => ({
        messageId: message.id,
        userId,
        readAt,
      })),
      skipDuplicates: true,
    });
    return messages.length;
  });
};

export const sendMessage = async (
  senderId,
  conversationId,
  content,
  cipherMeta,
  attachmentIds,
  replyToId,
) => {
  const now = new Date();
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        senderId,
        conversationId,
        content,
        createdAt: now,
        ...(cipherMeta ? { cipherMeta } : {}),
        ...(replyToId ? { replyToId } : {}),
        ...(attachmentIds?.length
          ? { attachments: { connect: attachmentIds.map((id) => ({ id })) } }
          : {}),
      },
      include: withDetails.include,
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: now,
      },
    }),
  ]);
  return message;
};

export const findUserReaction = (messageId, userId) => {
  return prisma.messageReaction.findFirst({
    where: { messageId, userId },
  });
};

export const createReaction = (messageId, userId, emoji) => {
  return prisma.messageReaction.create({
    data: { messageId, userId, emoji },
  });
};

export const deleteUserReactions = (messageId, userId) => {
  return prisma.messageReaction.deleteMany({
    where: { messageId, userId },
  });
};
