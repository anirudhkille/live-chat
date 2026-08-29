import { getIO } from "../../config/socket.js";
import * as messageRepository from "./message.repository.js";

export const getMessages = async (conversationId, before, limit) => {
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
  return await messageRepository.getMessages(conversationId, before, safeLimit);
};

export const sendMessage = async (senderId, conversationId, content) => {
  const message = await messageRepository.sendMessage(
    senderId,
    conversationId,
    content,
  );

  const io = getIO();
  io.to(`conversation:${conversationId}`).emit("new-message", message);

  return message;
};
