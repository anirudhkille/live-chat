import { prisma } from "../../config/prisma.js";

export const getMessages = (conversationId, before, limit) => {
  return prisma.message.findMany({
    where: {
      conversationId,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
};

export const sendMessage = async (senderId, conversationId, content) => {
  const now = new Date();
  const [message] = await prisma.$transaction([
    prisma.message.create({ data: { senderId, conversationId, content } }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: now,
      },
    }),
  ]);
  return message;
};
