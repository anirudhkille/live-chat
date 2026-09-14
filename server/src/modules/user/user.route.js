import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  searchUser,
  getAvatarUploadUrl,
  confirmAvatarUpload,
  getPreferences,
  updatePreferences,
} from "./user.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import {
  avatarUrlSchema,
  avatarConfirmSchema,
  updatePreferencesSchema,
} from "./user.schema.js";

const router = Router();

router.use(authenticate);

router.get("/search", searchUser);
router.get("/me/preferences", getPreferences);
router.patch("/me/preferences", validate(updatePreferencesSchema), updatePreferences);
router.post("/me/avatar-url", validate(avatarUrlSchema), getAvatarUploadUrl);
router.post("/me/avatar", validate(avatarConfirmSchema), confirmAvatarUpload);

export default router;
