import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { getAttachmentUploadUrl, confirmAttachmentUpload } from "./attachment.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", confirmAttachmentUpload);
router.post("/upload-url", getAttachmentUploadUrl);

export default router;
