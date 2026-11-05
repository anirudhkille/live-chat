import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  subscribe,
  unsubscribe,
  vapidKey,
  registerExpoToken,
  unregisterExpoToken,
} from "./push.controller.js";

const router = Router();

router.use(authenticate);

router.post("/subscribe", subscribe);
router.post("/unsubscribe", unsubscribe);
router.get("/vapid-key", vapidKey);
router.post("/expo-token", registerExpoToken);
router.delete("/expo-token", unregisterExpoToken);

export default router;
