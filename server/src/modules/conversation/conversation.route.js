import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  createOrGetConversation,
  getConversations,
  getConversationById,
  getConversationWithMessages,
  createGroup,
  getGroupPhotoUploadUrl,
  updateGroup,
  deleteGroup,
  getGroupParticipants,
  addGroupParticipants,
  removeGroupParticipant,
} from "./conversation.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import {
  createConversationSchema,
  createGroupSchema,
  addGroupParticipantsSchema,
  updateGroupSchema,
  groupPhotoUrlSchema,
} from "./conversation.schema.js";

const router = Router();

router.use(authenticate);

router.post("/group", validate(createGroupSchema), createGroup);
router.post("/group/photo-url", validate(groupPhotoUrlSchema), getGroupPhotoUploadUrl);
router.post("/", validate(createConversationSchema), createOrGetConversation);
router.get("/", getConversations);
router.get("/:id/participants", getGroupParticipants);
router.post("/:id/participants", validate(addGroupParticipantsSchema), addGroupParticipants);
router.delete("/:id/participants/:userId", removeGroupParticipant);
router.patch("/:id", validate(updateGroupSchema), updateGroup);
router.delete("/:id", deleteGroup);
router.get("/:id/with-messages", getConversationWithMessages);
router.get("/:id", getConversationById);

export default router;
