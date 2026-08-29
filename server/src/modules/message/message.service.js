import { getIO } from "../../config/socket.js";
import { AppError } from "../../utils/AppError.js";
import * as messageRepository from "./message.repository.js";
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
    throw new AppError("Message not found", 404);
  }
  if (message.senderId !== userId) {
    throw new AppError("Not authorized to modify this message", 403);
  }
  if (message.deletedAt) {
    throw new AppError("Cannot modify a deleted message", 400);
  }
};

export const updateMessage = async (userId, messageId, content) => {
  const existing = await messageRepository.findById(messageId);
  assertCanModify(existing, userId);

  const trimmed = content?.trim();
  if (!trimmed) {
    throw new AppError("Message content cannot be empty", 400);
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
) => {
  const message = await messageRepository.sendMessage(
    senderId,
    conversationId,
    content,
    attachmentIds,
  );

  const io = getIO();
  io.to(`conversation:${conversationId}`).emit("new-message", message);

  return message;
};
