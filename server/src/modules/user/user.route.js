import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { searchUser,getAvatarUploadUrl ,confirmAvatarUpload} from "./user.controller.js";

const router = Router();

router.use(authenticate);

router.get("/search", searchUser);
router.post("/me/avatar-url", getAvatarUploadUrl);
router.post("/me/avatar", confirmAvatarUpload);

export default router;
