import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  sendMessage,
  getMessages,
  markMessagesRead,
  updateMessage,
  deleteMessage,
  toggleReaction,
} from "./message.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import {
  updateMessageSchema,
  sendMessageSchema,
  toggleReactionSchema,
} from "./message.schema.js";

const router = Router();

router.use(authenticate);

router.post("/read/:conversationId", markMessagesRead);
router.post("/:messageId/reactions", validate(toggleReactionSchema), toggleReaction);
router.post("/:conversationId", validate(sendMessageSchema), sendMessage);
router.get("/:conversationId", getMessages);
router.patch("/:messageId", validate(updateMessageSchema), updateMessage);
router.delete("/:messageId", deleteMessage);

export default router;
