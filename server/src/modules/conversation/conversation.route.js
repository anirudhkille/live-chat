import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  createOrGetConversation,
  getConversations,
  getConversationById,
  createGroup,
  getGroupParticipants,
  addGroupParticipants,
} from "./conversation.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import {
  createConversationSchema,
  createGroupSchema,
  addGroupParticipantsSchema,
} from "./conversation.schema.js";

const router = Router();

router.use(authenticate);

router.post("/group", validate(createGroupSchema), createGroup);
router.post("/", validate(createConversationSchema), createOrGetConversation);
router.get("/", getConversations);
router.get("/:id/participants", getGroupParticipants);
router.post("/:id/participants", validate(addGroupParticipantsSchema), addGroupParticipants);
router.get("/:id", getConversationById);

export default router;