import * as conversationRepository from "./conversation.repository.js";
import * as userRepository from "../user/user.repository.js";
import { toConversationResponse, toParticipants } from "./conversation.mapper.js";
import { getIO, isUserOnline, emitToUser } from "../../config/socket.js";
import { AppError } from "../../utils/AppError.js";

export const createOrGetConversation = async (userId1, userId2) => {
  if (userId1 === userId2) {
    throw new AppError(400, "Cannot create a conversation with yourself");
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
  if (!conversation) {
    throw new AppError(404, "Conversation not found");
  }
  if (!conversation.participants.some((p) => p.userId === userId)) {
    throw new AppError(403, "You are not a participant of this conversation");
  }
  return toConversationResponse(conversation, userId);
};

export const createGroup = async (userId, { name, participantIds }) => {
  const uniqueIds = [...new Set(participantIds)];
  if (uniqueIds.some((id) => id === userId)) {
    throw new AppError(400, "You cannot add yourself as a participant");
  }

  const found = await userRepository.findByIds(uniqueIds);
  if (found.length !== uniqueIds.length) {
    throw new AppError(400, "One or more users do not exist");
  }

  const conversation = await conversationRepository.createGroup(
    userId,
    name,
    uniqueIds,
  );

  return toConversationResponse(conversation, userId);
};

export const getGroupParticipants = async (conversationId, userId) => {
  const conversation = await conversationRepository.getById(conversationId);
  if (!conversation || !conversation.isGroup) {
    throw new AppError(404, "Group not found");
  }
  if (!conversation.participants.some((p) => p.userId === userId)) {
    throw new AppError(403, "You are not a member of this group");
  }
  return toParticipants(conversation.participants);
};

export const addGroupParticipants = async (
  conversationId,
  actorId,
  participantIds,
) => {
  const conversation = await conversationRepository.getById(conversationId);
  if (!conversation || !conversation.isGroup) {
    throw new AppError(404, "Group not found");
  }
  if (!conversation.participants.some((p) => p.userId === actorId)) {
    throw new AppError(403, "Only group members can add participants");
  }

  const uniqueIds = [...new Set(participantIds)];
  if (uniqueIds.some((id) => id === actorId)) {
    throw new AppError(400, "You are already a member of this group");
  }

  const found = await userRepository.findByIds(uniqueIds);
  if (found.length !== uniqueIds.length) {
    throw new AppError(400, "One or more users do not exist");
  }

  const existingIds = new Set(conversation.participants.map((p) => p.userId));
  const newIds = uniqueIds.filter((id) => !existingIds.has(id));

  if (newIds.length > 0) {
    await conversationRepository.addParticipants(conversationId, newIds);
  }

  const updated = await conversationRepository.getById(conversationId);

  const io = getIO();
  io.to(`conversation:${conversationId}`).emit("conversation-updated", {
    conversationId,
  });
  for (const id of newIds) {
    if (isUserOnline(id)) {
      emitToUser(id, "new-conversation", { conversationId });
    }
  }

  return { added: newIds, participants: toParticipants(updated.participants) };
};