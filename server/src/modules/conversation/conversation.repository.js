import { prisma } from "../../config/prisma.js";

const participantsWithUser = {
  include: {
    user: {
      select: {
        id: true,
        name: true,
      },
    },
  },
};

export const create = (userId1, userId2) => {
  return prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId: userId1 }, { userId: userId2 }],
      },
    },
    include: { participants: participantsWithUser },
  });
};

export const get = (userId1, userId2) => {
  return prisma.conversation.findFirst({
    where: {
      isGroup: false,
      AND: [
        { participants: { some: { userId: userId1 } } },
        { participants: { some: { userId: userId2 } } },
      ],
    },
    include: { participants: participantsWithUser },
  });
};

export const getAll = (userId) => {
  return prisma.conversation.findMany({
    where: {
      isGroup: false,
      AND: [{ participants: { some: { userId: userId } } }],
    },
    include: {
      participants: participantsWithUser,
      messages: {
        take: 1,
        orderBy: {
          createdAt: "desc",
        },
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
    orderBy: {
      lastMessageAt: "desc",
    },
  });
};

export const getById = (conversationId) => {
  return prisma.conversation.findFirst({
    where: {
      isGroup: false,
      id: conversationId,
    },
    include: { participants: participantsWithUser },
  });
};
