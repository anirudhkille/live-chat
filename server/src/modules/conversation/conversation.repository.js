import { Prisma } from "../../generated/prisma/index.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { planLeaveGroup } from "./conversation.leave.js";

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

/**
 * Create or fetch a direct conversation atomically.
 *
 * There is no unique constraint over a participant pair (adding one would
 * require a migration), so a transaction-scoped advisory lock keyed by the two
 * sorted user ids serializes concurrent creation for the same pair.
 */
export const getOrCreateDirect = (userId1, userId2) => {
  const lockKey = [userId1, userId2].sort().join(":");
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey})::bigint)`;

    const existing = await tx.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { userId: userId1 } } },
          { participants: { some: { userId: userId2 } } },
        ],
      },
      include: { participants: participantsWithUser },
    });
    if (existing) return existing;

    return tx.conversation.create({
      data: {
        participants: {
          create: [{ userId: userId1 }, { userId: userId2 }],
        },
      },
      include: { participants: participantsWithUser },
    });
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
             m."deletedAt", m."cipherMeta",
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
        deletedAt: row.deletedAt ?? null,
        cipherMeta: row.cipherMeta ?? null,
        sender: row.senderId_
          ? { id: row.senderId_, name: row.senderName }
          : null,
      },
    ]),
  );
};

const unreadCountsByConversation = async (conversationIds, userId) => {
  const rows = await prisma.$queryRaw(
    sql`
      SELECT m."conversationId", COUNT(*)::int AS "count"
      FROM "Message" AS m
      JOIN "ConversationParticipant" AS p
        ON p."conversationId" = m."conversationId"
       AND p."userId" = ${userId}
      WHERE m."conversationId" IN (${join(conversationIds)})
        AND m."senderId" <> ${userId}
        AND NOT EXISTS (
          SELECT 1 FROM "MessageRead" AS r
          WHERE r."messageId" = m."id" AND r."userId" = ${userId}
        )
        AND (p."lastReadAt" IS NULL OR m."createdAt" > p."lastReadAt")
      GROUP BY m."conversationId"
    `,
  );

  return new Map(
    rows.map((row) => [row.conversationId, Number(row.count ?? 0)]),
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
  const [lastMessages, unreadByConversation] = await Promise.all([
    lastMessageByConversation(conversationIds),
    unreadCountsByConversation(conversationIds, userId),
  ]);

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

const deleteConversationInTransaction = async (tx, conversationId) => {
  await tx.message.updateMany({
    where: { conversationId },
    data: { replyToId: null },
  });
  await tx.messageReaction.deleteMany({
    where: { message: { conversationId } },
  });
  await tx.messageRead.deleteMany({ where: { message: { conversationId } } });
  await tx.attachment.deleteMany({ where: { message: { conversationId } } });
  await tx.message.deleteMany({ where: { conversationId } });
  await tx.conversationParticipant.deleteMany({ where: { conversationId } });
  await tx.conversation.delete({ where: { id: conversationId } });
};

export const deleteById = (conversationId) => {
  return prisma.$transaction((tx) =>
    deleteConversationInTransaction(tx, conversationId),
  );
};

const SERIALIZABLE_RETRY_LIMIT = 3;

const isRetryableTransactionError = (error) =>
  error?.code === "P2034" || error?.code === "40P01";

/**
 * Remove a participant atomically, re-checking the participant set inside a
 * SERIALIZABLE transaction so two concurrent leaves cannot both observe more
 * than one member and leave an orphaned zero-participant group behind.
 */
export const leaveGroup = async (conversationId, userId) => {
  for (let attempt = 0; attempt < SERIALIZABLE_RETRY_LIMIT; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const conversation = await tx.conversation.findFirst({
            where: { id: conversationId },
            include: { participants: true },
          });
          if (!conversation || !conversation.isGroup) {
            return { status: "not_found" };
          }

          const plan = planLeaveGroup(conversation.participants, userId);
          if (!plan.allowed) {
            return { status: "not_member" };
          }

          if (plan.deleted) {
            await deleteConversationInTransaction(tx, conversationId);
            return { status: "deleted" };
          }

          const removed = await tx.conversationParticipant.deleteMany({
            where: { conversationId, userId },
          });
          if (removed.count === 0) {
            return { status: "not_member" };
          }

          if (plan.promoteUserId) {
            await tx.conversationParticipant.updateMany({
              where: { conversationId, userId: plan.promoteUserId },
              data: { role: "admin" },
            });
          }

          return { status: "left", promoteUserId: plan.promoteUserId };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isRetryableTransactionError(error)) {
        if (attempt < SERIALIZABLE_RETRY_LIMIT - 1) continue;
        throw new AppError(409, "Could not leave the group, please try again");
      }
      throw error;
    }
  }

  throw new AppError(409, "Could not leave the group, please try again");
};

export const removeParticipant = (conversationId, userId) => {
  return prisma.conversationParticipant.deleteMany({
    where: { conversationId, userId },
  });
};

export const updateParticipantRole = (conversationId, userId, role) => {
  return prisma.conversationParticipant.updateMany({
    where: { conversationId, userId },
    data: { role },
  });
};
