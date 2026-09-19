import { prisma } from "../../config/prisma.js";

const participantsWithUser = {
  include: {
    user: {
      select: {
        id: true,
        name: true,
        avatar: true,
        email: true,
        phone: true,
        isOnline: true,
        lastOnlineAt: true,
        showOnline: true,
        pushNotifications: true,
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

  if (conversations.length === 0) return [];

  const unreadRows = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: { in: conversations.map((c) => c.id) },
      senderId: { not: userId },
      reads: { none: { userId } },
    },
    _count: { _all: true },
  });
  const unreadByConversation = new Map(
    unreadRows.map((row) => [row.conversationId, row._count._all]),
  );

  return conversations.map((conversation) => ({
    ...conversation,
    _unreadCount: unreadByConversation.get(conversation.id) ?? 0,
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

export const createGroup = (ownerId, name, participantIds, photoUrl = null) => {
  return prisma.conversation.create({
    data: {
      isGroup: true,
      name,
      photoUrl,
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

export const findParticipant = (conversationId, userId) => {
  return prisma.conversationParticipant.findFirst({
    where: { conversationId, userId },
  });
};

export const updateById = (conversationId, data) => {
  return prisma.conversation.update({
    where: { id: conversationId },
    data,
    include: { participants: participantsWithUser },
  });
};

export const deleteById = (conversationId) => {
  return prisma.conversation.delete({
    where: { id: conversationId },
  });
};

export const removeParticipant = (conversationId, userId) => {
  return prisma.conversationParticipant.deleteMany({
    where: { conversationId, userId },
  });
};
