import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { getCallLogs } from "./call.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", getCallLogs);

export default router;
