import { getIO } from "../../config/socket.js";
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
