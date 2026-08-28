import * as conversationRepository from "./conversation.repository.js";
import { toConversationResponse } from "./conversation.mapper.js";
import { AppError } from "../../utils/AppError.js";

export const createOrGetConversation = async (userId1, userId2) => {
  if (userId1 === userId2) {
    throw new AppError("Cannot create a conversation with yourself", 400);
  }

  let conversation = await conversationRepository.get(userId1, userId2);

  if (!conversation) {
    conversation = await conversationRepository.create(userId1, userId2);
  }

  return toConversationResponse(conversation, userId1);
};

export const getConversations = async (userId1) => {
  const conversation = await conversationRepository.getAll(userId1);
  return conversation.map((c) => toConversationResponse(c, userId1));
};

export const getConversationById = async (conversationId, userId) => {
  const conversation = await conversationRepository.getById(conversationId);
  return toConversationResponse(conversation, userId);
};
