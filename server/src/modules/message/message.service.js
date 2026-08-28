import { getIO } from "../../config/socket.js";
import * as messageRepository from "./message.repository.js";

export const getMessages = async (conversationId) => {
  return await messageRepository.getMessages(conversationId);
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
