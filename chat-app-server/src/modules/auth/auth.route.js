import express from "express";
import { validate } from "../../middleware/validate.middleware.js";
import {
  sendLoginOtp,
  verifyLoginOtp,
  refreshToken,
  logout,
  updateProfile,
  googleAuth,
  googleCallback,
} from "./auth.controller.js";
import { sendLoginOtpSchema, verifyLoginOtpSchema } from "./auth.schema.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/send-login-otp", validate(sendLoginOtpSchema), sendLoginOtp);
router.post(
  "/verify-login-otp",
  validate(verifyLoginOtpSchema),
  verifyLoginOtp,
);
router.get("/refresh", refreshToken);
router.post("/logout", logout);
router.patch("/profile", authenticate, updateProfile);
router.get("/google", googleAuth);
router.get("/google/callback", googleCallback);

export default router;
