import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  getAttachmentUploadUrl,
  confirmAttachmentUpload,
} from "./attachment.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import {
  attachmentUrlSchema,
  attachmentConfirmSchema,
} from "./attachment.schema.js";

const router = Router();

router.use(authenticate);

router.post("/", validate(attachmentConfirmSchema), confirmAttachmentUpload);
router.post(
  "/upload-url",
  validate(attachmentUrlSchema),
  getAttachmentUploadUrl,
);

export default router;
