import crypto from "crypto";
import * as conversationRepository from "./conversation.repository.js";
import * as userRepository from "../user/user.repository.js";
import * as messageRepository from "../message/message.repository.js";
import * as storageService from "../storage/storage.service.js";
import { env } from "../../config/env.config.js";
import {
  toConversationResponse,
  toParticipants,
} from "./conversation.mapper.js";
import {
  emitToConversation,
  isUserOnline,
  emitToUser,
} from "../../config/socket.js";
import { AppError } from "../../utils/AppError.js";

const GROUP_PHOTO_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const GROUP_PHOTO_MAX_SIZE = 5 * 1024 * 1024; // 5MB

const assertGroupAdmin = async (conversationId, actorId) => {
  const conversation = await conversationRepository.getById(conversationId);
  if (!conversation || !conversation.isGroup) {
    throw new AppError(404, "Group not found");
  }
  const participant = conversation.participants.find(
    (p) => p.userId === actorId,
  );
  if (!participant) {
    throw new AppError(403, "You are not a member of this group");
  }
  if (participant.role !== "admin") {
    throw new AppError(403, "Only group admins can do this");
  }
  return conversation;
};

const assertGroupPhoto = async (photoKey) => {
  let metadata;
  try {
    metadata = await storageService.getObjectMetadata(photoKey);
  } catch {
    throw new AppError(404, "Group photo not found");
  }
  if ((metadata.ContentLength ?? 0) > GROUP_PHOTO_MAX_SIZE) {
    throw new AppError(400, "Group photo is too large");
  }
};

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

export const getConversationWithMessages = async (
  conversationId,
  userId,
  limit = 30,
) => {
  const conversation = await getConversationById(conversationId, userId);
  const messages = await messageRepository.getMessages(
    conversationId,
    null,
    limit,
  );
  const nextCursor =
    messages.length === limit ? messages[messages.length - 1].createdAt : null;
  return { conversation, messages, nextCursor };
};

export const createGroup = async (
  userId,
  { name, participantIds, photoKey },
) => {
  const uniqueIds = [...new Set(participantIds)];
  if (uniqueIds.some((id) => id === userId)) {
    throw new AppError(400, "You cannot add yourself as a participant");
  }

  const found = await userRepository.findByIds(uniqueIds);
  if (found.length !== uniqueIds.length) {
    throw new AppError(400, "One or more users do not exist");
  }

  let photoUrl = null;
  if (photoKey) {
    await assertGroupPhoto(photoKey);
    photoUrl = `${env.R2_PUBLIC_URL}/${photoKey}`;
  }

  const conversation = await conversationRepository.createGroup(
    userId,
    name,
    uniqueIds,
    photoUrl,
  );

  return toConversationResponse(conversation, userId);
};

export const getGroupPhotoUploadUrl = async (contentType) => {
  if (!GROUP_PHOTO_ALLOWED_TYPES.includes(contentType)) {
    throw new AppError(400, "Unsupported file type");
  }
  const key = `groups/${crypto.randomUUID()}`;
  const uploadUrl = await storageService.generatePresignedUploadUrl(
    key,
    contentType,
  );
  return { uploadUrl, key };
};

export const updateGroup = async (
  conversationId,
  actorId,
  { name, photoKey },
) => {
  await assertGroupAdmin(conversationId, actorId);

  if (name !== undefined && (!name || name.trim().length === 0)) {
    throw new AppError(400, "Group name can't be empty");
  }

  const data = {};
  if (name !== undefined) data.name = name.trim();
  if (photoKey !== undefined) {
    await assertGroupPhoto(photoKey);
    data.photoUrl = `${env.R2_PUBLIC_URL}/${photoKey}`;
  }

  const updated = await conversationRepository.updateById(conversationId, data);

  emitToConversation(conversationId, "conversation-updated", {
    conversationId,
  });

  return toConversationResponse(updated, actorId);
};

export const deleteGroup = async (conversationId, actorId) => {
  await assertGroupAdmin(conversationId, actorId);

  await conversationRepository.deleteById(conversationId);

  emitToConversation(conversationId, "group-deleted", {
    conversationId,
  });

  return { deleted: true };
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
  const conversation = await assertGroupAdmin(conversationId, actorId);

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

  emitToConversation(conversationId, "conversation-updated", {
    conversationId,
  });
  for (const id of newIds) {
    if (isUserOnline(id)) {
      emitToUser(id, "new-conversation", { conversationId });
    }
  }

  return { added: newIds, participants: toParticipants(updated.participants) };
};

export const removeGroupParticipant = async (
  conversationId,
  actorId,
  targetUserId,
) => {
  await assertGroupAdmin(conversationId, actorId);

  if (actorId === targetUserId) {
    throw new AppError(400, "You cannot remove yourself");
  }

  const participant = await conversationRepository.findParticipant(
    conversationId,
    targetUserId,
  );
  if (!participant) {
    throw new AppError(404, "Member not found in this group");
  }

  await conversationRepository.removeParticipant(conversationId, targetUserId);

  emitToConversation(conversationId, "conversation-updated", {
    conversationId,
  });
  if (isUserOnline(targetUserId)) {
    emitToUser(targetUserId, "removed-from-group", { conversationId });
  }

  return { removed: targetUserId };
};
