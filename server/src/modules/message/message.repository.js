import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

export const withDetails = {
  include: {
    attachments: true,
    reads: {
      where: { user: { readReceipts: true } },
      take: 1,
      orderBy: { readAt: "desc" },
    },
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
        attachments: true,
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

export const findInConversationForUser = (messageId, userId) => {
  return prisma.message.findFirst({
    where: {
      id: messageId,
      conversation: { participants: { some: { userId } } },
    },
    ...withDetails,
  });
};

export const getMessages = (conversationId, before, limit) => {
  return prisma.message.findMany({
    where: {
      conversationId,
      ...(before ? { createdAt: { lt: before } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...withDetails,
  });
};

export const updateMessage = (messageId, { content, cipherMeta }) => {
  return prisma.message.update({
    where: { id: messageId },
    data: {
      content,
      ...(cipherMeta !== undefined ? { cipherMeta } : {}),
    },
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
  return prisma.$transaction(async (tx) => {
    const messages = await tx.message.findMany({
      where: {
        conversationId,
        senderId: { not: userId },
        reads: { none: { userId } },
      },
      select: { id: true },
    });

    const readAt = new Date();
    if (messages.length > 0) {
      await tx.messageRead.createMany({
        data: messages.map((message) => ({
          messageId: message.id,
          userId,
          readAt,
        })),
        skipDuplicates: true,
      });
    }

    await tx.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: readAt },
    });

    return messages.length;
  });
};

/**
 * Advance the participant's read position without creating read receipts.
 * Unread counts are derived from this position for users who disabled receipts.
 */
export const markReadPosition = (conversationId, userId) => {
  return prisma.conversationParticipant.updateMany({
    where: { conversationId, userId },
    data: { lastReadAt: new Date() },
  });
};

export const sendMessage = async (
  senderId,
  conversationId,
  content,
  cipherMeta,
  attachmentIds,
  replyToId,
) => {
  const now = new Date();
  const ids = attachmentIds?.length ? [...new Set(attachmentIds)] : [];

  return prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        senderId,
        conversationId,
        content,
        createdAt: now,
        ...(cipherMeta ? { cipherMeta } : {}),
        ...(replyToId ? { replyToId } : {}),
      },
      include: withDetails.include,
    });

    if (ids.length > 0) {
      // Claim only unclaimed attachments that are stored under the sender's
      // prefix. The count check rolls the whole transaction back if any id was
      // already attached (or is not owned by the sender).
      const claimed = await tx.attachment.updateMany({
        where: {
          id: { in: ids },
          messageId: null,
          url: { contains: `/attachments/${senderId}/` },
        },
        data: { messageId: message.id },
      });
      if (claimed.count !== ids.length) {
        throw new AppError(
          400,
          "One or more attachments are invalid, already used, or not owned by you",
        );
      }
    }

    await tx.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: now,
      },
    });

    if (ids.length === 0) return message;

    return tx.message.findUnique({
      where: { id: message.id },
      ...withDetails,
    });
  });
};

export const findUserReaction = (messageId, userId) => {
  return prisma.messageReaction.findFirst({
    where: { messageId, userId },
  });
};

export const createReaction = (messageId, userId, emoji) => {
  return prisma.messageReaction.create({
    data: { messageId, userId, emoji },
  });
};

export const deleteUserReactions = (messageId, userId) => {
  return prisma.messageReaction.deleteMany({
    where: { messageId, userId },
  });
};
