import { prisma } from "../../config/prisma.js";

const participantsWithUser = {
  include: {
    user: {
      select: {
        id: true,
        name: true,
        avatar: true,
        email: true,
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

export const getAll = async (userId) => {
  const conversations = await prisma.conversation.findMany({
    where: {
      participants: { some: { userId: userId } },
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

  const unreadCounts = await Promise.all(
    conversations.map((conversation) =>
      prisma.message.count({
        where: {
          conversationId: conversation.id,
          senderId: { not: userId },
          reads: { none: { userId } },
        },
      }),
    ),
  );

  return conversations.map((conversation, index) => ({
    ...conversation,
    _unreadCount: unreadCounts[index],
  }));
};

export const getById = (conversationId) => {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
    },
    include: { participants: participantsWithUser },
  });
};

export const createGroup = (ownerId, name, participantIds) => {
  return prisma.conversation.create({
    data: {
      isGroup: true,
      name,
      participants: {
        create: [
          { userId: ownerId, role: "admin" },
          ...participantIds.map((userId) => ({ userId, role: "member" })),
        ],
      },
    },
    include: { participants: participantsWithUser },
  });
};

export const addParticipants = (conversationId, userIds) => {
  return prisma.conversationParticipant.createMany({
    data: userIds.map((userId) => ({
      userId,
      conversationId,
      role: "member",
    })),
    skipDuplicates: true,
  });
};
