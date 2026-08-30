import { getIO, isUserOnline } from "../../config/socket.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../utils/AppError.js";
import * as messageRepository from "./message.repository.js";
import * as conversationRepository from "../conversation/conversation.repository.js";
import * as pushService from "../push/push.service.js";
import { toMessageResponse } from "./message.mapper.js";

export const getMessages = async (conversationId, before, limit) => {
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
  const messages = await messageRepository.getMessages(
    conversationId,
    before,
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
  getIO()
    .to(`conversation:${existing.conversationId}`)
    .emit("message-updated", {
      conversationId: existing.conversationId,
      message: toMessageResponse(message),
    });

  return toMessageResponse(message);
};

export const deleteMessage = async (userId, messageId) => {
  const existing = await messageRepository.findById(messageId);
  assertCanModify(existing, userId);

  const message = await messageRepository.deleteMessage(messageId);
  getIO()
    .to(`conversation:${existing.conversationId}`)
    .emit("message-deleted", {
      conversationId: existing.conversationId,
      message: toMessageResponse(message),
    });

  return toMessageResponse(message);
};

export const markMessagesRead = async (userId, conversationId) => {
  const updatedCount = await messageRepository.markMessagesRead(
    conversationId,
    userId,
  );

  if (updatedCount > 0) {
    const readAt = new Date().toISOString();
    getIO()
      .to(`conversation:${conversationId}`)
      .emit("messages-read", { conversationId, userId, readAt });
  }

  return { conversationId, updatedCount };
};

export const sendMessage = async (
  senderId,
  conversationId,
  content,
  attachmentIds,
  replyToId,
) => {
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
    attachmentIds,
    replyToId,
  );

  const response = {
    ...toMessageResponse(message),
    conversationId,
  };

  const io = getIO();
  io.to(`conversation:${conversationId}`).emit("new-message", response);

  notifyOfflineRecipient(senderId, conversationId, content, attachmentIds);

  return response;
};

export const toggleReaction = async (userId, messageId, emoji) => {
  const existing = await messageRepository.findById(messageId);
  if (!existing) {
    throw new AppError(404, "Message not found");
  }

  const conversation = await conversationRepository.getById(
    existing.conversationId,
  );
  if (!conversation.participants.some((p) => p.userId === userId)) {
    throw new AppError(403, "You are not a participant of this conversation");
  }

  const message = await messageRepository.toggleReaction(
    messageId,
    userId,
    emoji,
  );

  getIO()
    .to(`conversation:${existing.conversationId}`)
    .emit("message-reacted", {
      conversationId: existing.conversationId,
      message: toMessageResponse(message),
    });

  return toMessageResponse(message);
};

const notifyOfflineRecipient = async (
  senderId,
  conversationId,
  content,
  attachmentIds,
) => {
  try {
    const conversation = await conversationRepository.getById(conversationId);
    if (!conversation) return;

    const sender = conversation.participants.find(
      (participant) => participant.userId === senderId,
    );
    const recipients = conversation.participants.filter(
      (participant) =>
        participant.userId !== senderId && !isUserOnline(participant.userId),
    );
    if (recipients.length === 0) return;

    await Promise.all(
      recipients.map((recipient) =>
        pushService.sendMessageNotification({
          userId: recipient.userId,
          senderName: sender?.user?.name ?? null,
          conversationId,
          content,
          attachmentCount: Array.isArray(attachmentIds)
            ? attachmentIds.length
            : 0,
        }),
      ),
    );
  } catch (error) {
    logger.error(
      { err: error.message, conversationId, userId: senderId },
      "Web push notification failed",
    );
  }
};
