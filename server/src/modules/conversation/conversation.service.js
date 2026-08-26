import * as conversationRepository from "./conversation.repository.js";

export const createOrGetConversation = async (userId1, userId2) => {
  if (userId1 === userId2) {
    throw new AppError("Cannot create a conversation with yourself", 400);
  }

  let conversation = await conversationRepository.get(userId1, userId2);

  if (!conversation) {
    conversation = await conversationRepository.create(userId1, userId2);
  }

  return conversation;
};