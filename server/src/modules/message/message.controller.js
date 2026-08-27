import { asyncHandler } from "../../utils/asyncHandler.js";
import * as messageService from "./message.service.js";
import { sendResponse } from "../../utils/response.js";

export const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const messages = await messageService.getMessages(conversationId);

  sendResponse(res, 200, "Messages fetched", messages);
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { content } = req.body;

  const messages = await messageService.sendMessage(
    req.user.id,
    conversationId,
    content,
  );
  sendResponse(res, 200, "Messages fetched", messages);
});
