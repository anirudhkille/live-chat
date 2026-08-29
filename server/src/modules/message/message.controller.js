import { asyncHandler } from "../../utils/asyncHandler.js";
import * as messageService from "./message.service.js";
import { sendResponse } from "../../utils/response.js";

export const getMessages = asyncHandler(async (req, res) => {
  const { before, limit } = req.query;
  const { conversationId } = req.params;
  const messages = await messageService.getMessages(
    conversationId,
    before,
    limit,
  );

  sendResponse(res, 200, "Messages fetched", messages);
});

export const markMessagesRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const result = await messageService.markMessagesRead(
    req.user.id,
    conversationId,
  );
  sendResponse(res, 200, "Messages marked as read", result);
});

export const updateMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;
  const message = await messageService.updateMessage(
    req.user.id,
    messageId,
    content,
  );
  sendResponse(res, 200, "Message updated", message);
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const message = await messageService.deleteMessage(req.user.id, messageId);
  sendResponse(res, 200, "Message deleted", message);
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { content, attachmentIds } = req.body;

  const messages = await messageService.sendMessage(
    req.user.id,
    conversationId,
    content,
    Array.isArray(attachmentIds) ? attachmentIds : undefined,
  );
  sendResponse(res, 200, "Messages sent successfully", messages);
});
