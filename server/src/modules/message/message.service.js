import {
  emitToConversation,
  isUserInRoom,
  conversationRoom,
} from "../../config/socket.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../utils/AppError.js";
import * as messageRepository from "./message.repository.js";
import * as conversationRepository from "../conversation/conversation.repository.js";
import * as pushService from "../push/push.service.js";
import { toMessageResponse } from "./message.mapper.js";

const assertParticipant = async (conversationId, userId) => {
  const participant = await conversationRepository.findParticipant(
    conversationId,
    userId,
  );
  if (!participant) {
    throw new AppError(403, "You are not a participant of this conversation");
  }
};

const parseBefore = (before) => {
  if (!before) return null;
  const date = new Date(before);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, "Invalid before date");
  }
  return date;
};

export const getMessages = async (userId, conversationId, before, limit) => {
  await assertParticipant(conversationId, userId);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
  const parsedBefore = parseBefore(before);
  const messages = await messageRepository.getMessages(
    conversationId,
    parsedBefore,
    safeLimit,
  );
  return messages.map(toMessageResponse);
};

const assertCanModify = (message, userId) => {
  if (!message) {
    throw new AppError(404, "Message not found");
  }
  if (message.senderId !== userId) {
    throw new AppError(403, "Not authorized to modify this message");
  }
  if (message.deletedAt) {
    throw new AppError(400, "Cannot modify a deleted message");
  }
};

export const updateMessage = async (userId, messageId, content) => {
  const existing = await messageRepository.findById(messageId);
  assertCanModify(existing, userId);

  const trimmed = content?.trim();
  if (!trimmed) {
    throw new AppError(400, "Message content cannot be empty");
  }

  const message = await messageRepository.updateMessage(messageId, trimmed);
  emitToConversation(existing.conversationId, "message-updated", {
    conversationId: existing.conversationId,
    message: toMessageResponse(message),
  });

  return toMessageResponse(message);
};

export const deleteMessage = async (userId, messageId) => {
  const existing = await messageRepository.findById(messageId);
  assertCanModify(existing, userId);

  const message = await messageRepository.deleteMessage(messageId);
  emitToConversation(existing.conversationId, "message-deleted", {
    conversationId: existing.conversationId,
    message: toMessageResponse(message),
  });

  return toMessageResponse(message);
};

export const markMessagesRead = async (userId, conversationId) => {
  await assertParticipant(conversationId, userId);
  const updatedCount = await messageRepository.markMessagesRead(
    conversationId,
    userId,
  );

  if (updatedCount > 0) {
    const readAt = new Date().toISOString();
    emitToConversation(conversationId, "messages-read", {
      conversationId,
      userId,
      readAt,
    });
  }

  return { conversationId, updatedCount };
};

export const sendMessage = async (
  senderId,
  conversationId,
  content,
  cipherMeta,
  attachmentIds,
  replyToId,
) => {
  await assertParticipant(conversationId, senderId);

  if (replyToId) {
    const parent = await messageRepository.findById(replyToId);
    if (!parent || parent.conversationId !== conversationId) {
      throw new AppError(400, "The message you're replying to is not valid");
    }
  }

  const message = await messageRepository.sendMessage(
    senderId,
    conversationId,
    content,
    cipherMeta,
    attachmentIds,
    replyToId,
  );

  const response = {
    ...toMessageResponse(message),
    conversationId,
  };

  const isAudio =
    (message.attachments?.length ?? 0) > 0 &&
    (message.attachments ?? []).every((a) => a.type === "AUDIO") &&
    !content?.trim();

  emitToConversation(conversationId, "new-message", response);
  emitToConversation(conversationId, "conversation-updated", {
    conversationId,
  });

  notifyRecipients(
    senderId,
    conversationId,
    content,
    attachmentIds,
    isAudio,
    !!cipherMeta,
  );

  return response;
};

export const toggleReaction = async (userId, messageId, emoji) => {
  const message = await messageRepository.findInConversationForUser(
    messageId,
    userId,
  );
  if (!message) {
    throw new AppError(404, "Message not found");
  }

  const existing = await messageRepository.findUserReaction(messageId, userId);
  if (existing) {
    await messageRepository.deleteUserReactions(messageId, userId);
    if (existing.emoji !== emoji) {
      await messageRepository.createReaction(messageId, userId, emoji);
    }
  } else {
    await messageRepository.createReaction(messageId, userId, emoji);
  }

  const updated = await messageRepository.findById(messageId);

  emitToConversation(message.conversationId, "message-reacted", {
    conversationId: message.conversationId,
    message: toMessageResponse(updated),
  });

  return toMessageResponse(updated);
};

const notifyRecipients = async (
  senderId,
  conversationId,
  content,
  attachmentIds,
  isAudio,
  isEncrypted,
) => {
  try {
    const conversation = await conversationRepository.getById(conversationId);
    if (!conversation) return;

    const sender = conversation.participants.find(
      (participant) => participant.userId === senderId,
    );
    const recipients = conversation.participants.filter(
      (participant) =>
        participant.userId !== senderId && participant.user?.pushNotifications,
    );
    if (recipients.length === 0) return;

    const offlineRecipients = recipients.filter(
      (recipient) =>
        !isUserInRoom(recipient.userId, conversationRoom(conversationId)),
    );
    if (offlineRecipients.length === 0) return;

    await pushService.sendBulkMessageNotifications(
      offlineRecipients.map((recipient) => ({
        userId: recipient.userId,
        senderName: sender?.user?.name ?? null,
        conversationId,
        content,
        attachmentCount: Array.isArray(attachmentIds)
          ? attachmentIds.length
          : 0,
        isAudio,
        isEncrypted,
      })),
    );
  } catch (error) {
    logger.error(
      { err: error.message, conversationId, userId: senderId },
      "Web push notification failed",
    );
  }
};
