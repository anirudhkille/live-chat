import { asyncHandler } from "../../utils/asyncHandler.js";
import * as conversationService from "./conversation.service.js";
import { sendResponse } from "../../utils/response.js";

export const createOrGetConversation = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const conversation = await conversationService.createOrGetConversation(
    req.user.id,
    userId,
  );
  sendResponse(res, 200, "Conversation created or fetched", conversation);
});

export const getConversations = asyncHandler(async (req, res) => {
  const conversation = await conversationService.getConversations(req.user.id);
  sendResponse(res, 200, "Conversation fetched successfully", conversation);
});

export const getConversationById = asyncHandler(async (req, res) => {
  const conversation = await conversationService.getConversationById(
    req.params.id,
    req.user.id,
  );
  sendResponse(res, 200, "Conversation fetched successfully", conversation);
});

export const getConversationWithMessages = asyncHandler(async (req, res) => {
  const requestedLimit = Number(req.query.limit);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(100, Math.max(1, requestedLimit))
    : 30;
  const result = await conversationService.getConversationWithMessages(
    req.params.id,
    req.user.id,
    limit,
  );
  sendResponse(res, 200, "Conversation and messages fetched", result);
});

export const createGroup = asyncHandler(async (req, res) => {
  const group = await conversationService.createGroup(req.user.id, req.body);
  sendResponse(res, 201, "Group created successfully", group);
});

export const getGroupPhotoUploadUrl = asyncHandler(async (req, res) => {
  const { contentType } = req.body;
  const urlData = await conversationService.getGroupPhotoUploadUrl(contentType);
  sendResponse(res, 200, "Group photo upload url generated", urlData);
});

export const updateGroup = asyncHandler(async (req, res) => {
  const group = await conversationService.updateGroup(
    req.params.id,
    req.user.id,
    req.body,
  );
  sendResponse(res, 200, "Group updated successfully", group);
});

export const deleteGroup = asyncHandler(async (req, res) => {
  const result = await conversationService.deleteGroup(
    req.params.id,
    req.user.id,
  );
  sendResponse(res, 200, "Group deleted successfully", result);
});

export const getGroupParticipants = asyncHandler(async (req, res) => {
  const participants = await conversationService.getGroupParticipants(
    req.params.id,
    req.user.id,
  );
  sendResponse(res, 200, "Group members fetched successfully", participants);
});

export const addGroupParticipants = asyncHandler(async (req, res) => {
  const result = await conversationService.addGroupParticipants(
    req.params.id,
    req.user.id,
    req.body.participantIds,
  );
  sendResponse(res, 200, "Members added to group", result);
});

export const removeGroupParticipant = asyncHandler(async (req, res) => {
  const result = await conversationService.removeGroupParticipant(
    req.params.id,
    req.user.id,
    req.params.userId,
  );
  sendResponse(res, 200, "Member removed from group", result);
});
