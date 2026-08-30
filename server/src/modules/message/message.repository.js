import { prisma } from "../../config/prisma.js";

const withDetails = {
  include: {
    attachments: true,
    reads: true,
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

export const getMessages = (conversationId, before, limit) => {
  return prisma.message.findMany({
    where: {
      conversationId,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
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
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      senderId: { not: userId },
      reads: { none: { userId } },
    },
    select: { id: true },
  });
  if (messages.length === 0) return 0;

  const readAt = new Date();
  await prisma.messageRead.createMany({
    data: messages.map((message) => ({
      messageId: message.id,
      userId,
      readAt,
    })),
    skipDuplicates: true,
  });
  return messages.length;
};

export const sendMessage = async (
  senderId,
  conversationId,
  content,
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
        ...(replyToId ? { replyToId } : {}),
        ...(attachmentIds?.length
          ? { attachments: { connect: attachmentIds.map((id) => ({ id })) } }
          : {}),
      },
      include: {
        attachments: true,
        reads: true,
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
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
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

export const toggleReaction = async (messageId, userId, emoji) => {
  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId, emoji } },
  });

  if (existing) {
    await prisma.messageReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.messageReaction.create({ data: { messageId, userId, emoji } });
  }

  return prisma.message.findUnique({
    where: { id: messageId },
    ...withDetails,
  });
};
