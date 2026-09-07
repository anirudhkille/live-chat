import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { getOwnKey, saveKey, getPeerPublicKey } from "./userKey.controller.js";

const router = Router();

router.use(authenticate);

router.get("/me", getOwnKey);
router.post("/", saveKey);
router.get("/peer/:peerId", getPeerPublicKey);

export default router;
