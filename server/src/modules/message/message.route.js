import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  sendMessage,
  getMessages,
  markMessagesRead,
} from "./message.controller.js";

const router = Router();

router.use(authenticate);

// NOTE: "/read/:conversationId" must be registered before "/:conversationId"
router.post("/read/:conversationId", markMessagesRead);
router.post("/:conversationId", sendMessage);
router.get("/:conversationId", getMessages);

export default router;
