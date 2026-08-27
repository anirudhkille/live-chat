import { AppError } from "../../utils/AppError.js";
import * as messageRepository from "./message.repository.js";

export const getMessages = async (conversationId) => {
  return messageRepository.getMessages(conversationId);
};

export const sendMessage = async (senderId, conversationId, content) => {
  return messageRepository.sendMessage(senderId, conversationId, content);
};
