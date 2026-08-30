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

export const createGroup = asyncHandler(async (req, res) => {
  const group = await conversationService.createGroup(req.user.id, req.body);
  sendResponse(res, 201, "Group created successfully", group);
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
