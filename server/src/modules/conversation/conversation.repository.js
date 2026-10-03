import { Prisma } from "../../generated/prisma/index.js";
import { prisma } from "../../config/prisma.js";

const { sql, join } = Prisma;

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

const lastMessageByConversation = async (conversationIds) => {
  const rows = await prisma.$queryRaw(
    sql`
      SELECT DISTINCT ON (m."conversationId")
             m."id", m."conversationId", m."content", m."createdAt",
             u."id" AS "senderId_", u."name" AS "senderName"
      FROM "Message" AS m
      LEFT JOIN "User" AS u ON u."id" = m."senderId"
      WHERE m."conversationId" IN (${join(conversationIds)})
      ORDER BY m."conversationId", m."createdAt" DESC
    `,
  );

  return new Map(
    rows.map((row) => [
      row.conversationId,
      {
        id: row.id,
        content: row.content,
        createdAt: row.createdAt,
        sender: row.senderId_
          ? { id: row.senderId_, name: row.senderName }
          : null,
      },
    ]),
  );
};

export const getAll = async (userId) => {
  const conversations = await prisma.conversation.findMany({
    where: {
      participants: { some: { userId: userId } },
    },
    include: { participants: participantsWithUser },
    orderBy: {
      lastMessageAt: "desc",
    },
  });

  if (conversations.length === 0) return [];

  const conversationIds = conversations.map((c) => c.id);
  const [lastMessages, unreadRows] = await Promise.all([
    lastMessageByConversation(conversationIds),
    prisma.message.groupBy({
      by: ["conversationId"],
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: userId },
        reads: { none: { userId } },
      },
      _count: { _all: true },
    }),
  ]);

  const unreadByConversation = new Map(
    unreadRows.map((row) => [row.conversationId, row._count._all]),
  );

  return conversations.map((conversation) => {
    const lastMessage = lastMessages.get(conversation.id);
    return {
      ...conversation,
      messages: lastMessage ? [lastMessage] : [],
      _unreadCount: unreadByConversation.get(conversation.id) ?? 0,
    };
  });
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
  return prisma.$transaction([
    prisma.message.updateMany({
      where: { conversationId },
      data: { replyToId: null },
    }),
    prisma.messageReaction.deleteMany({
      where: { message: { conversationId } },
    }),
    prisma.messageRead.deleteMany({ where: { message: { conversationId } } }),
    prisma.attachment.deleteMany({ where: { message: { conversationId } } }),
    prisma.message.deleteMany({ where: { conversationId } }),
    prisma.conversationParticipant.deleteMany({ where: { conversationId } }),
    prisma.conversation.delete({ where: { id: conversationId } }),
  ]);
};

export const removeParticipant = (conversationId, userId) => {
  return prisma.conversationParticipant.deleteMany({
    where: { conversationId, userId },
  });
};
