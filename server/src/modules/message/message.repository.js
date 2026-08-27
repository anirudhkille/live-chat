import { prisma } from "../../config/prisma.js";

export const getMessages = (conversationId) => {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
};

export const sendMessage = (senderId, conversationId, content) => {
  const now = new Date();
  const [message] = prisma.$transaction([
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
