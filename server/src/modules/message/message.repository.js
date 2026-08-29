import { prisma } from "../../config/prisma.js";

const withDetails = {
  include: {
    attachments: true,
    reads: true,
  },
};

export const findById = (messageId) => {
  return prisma.message.findUnique({ where: { id: messageId } });
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
) => {
  const now = new Date();
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        senderId,
        conversationId,
        content,
        ...(attachmentIds?.length
          ? { attachments: { connect: attachmentIds.map((id) => ({ id })) } }
          : {}),
      },
      include: {
        attachments: true,
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
