import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { searchUser } from "./user.controller.js";

const router = Router();

router.use(authenticate);

router.get("/search", searchUser);

export default router;
