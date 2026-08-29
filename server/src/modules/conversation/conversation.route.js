import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  createOrGetConversation,
  getConversations,
  getConversationById,
} from "./conversation.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { createConversationSchema } from "./conversation.schema.js";

const router = Router();

router.use(authenticate);

router.post("/", validate(createConversationSchema), createOrGetConversation);
router.get("/", getConversations);
router.get("/:id", getConversationById);

export default router;
