import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  createOrGetConversation,
  getConversations,
  getConversationById,
} from "./conversation.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", createOrGetConversation);
router.get("/", getConversations);
router.get("/:id", getConversationById);

export default router;
