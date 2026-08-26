import { prisma } from "../../config/prisma.js";

export const getMessages = (conversationId) => {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
};

export const sendMessage = (senderId, conversationId, content) => {
  return prisma.message.create({ data: { senderId, conversationId, content } });
};
