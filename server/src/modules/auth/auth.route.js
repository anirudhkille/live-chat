import express from "express";
import { validate } from "../../middleware/validate.middleware.js";
import { rateLimit } from "../../middleware/rateLimit.middleware.js";
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

router.post(
  "/send-login-otp",
  rateLimit({ windowMs: 60 * 1000, max: 5, keyPrefix: "send-otp" }),
  validate(sendLoginOtpSchema),
  sendLoginOtp,
);
router.post(
  "/verify-login-otp",
  rateLimit({ windowMs: 60 * 1000, max: 10, keyPrefix: "verify-otp" }),
  validate(verifyLoginOtpSchema),
  verifyLoginOtp,
);
router.get(
  "/refresh",
  rateLimit({ windowMs: 60 * 1000, max: 30, keyPrefix: "refresh" }),
  refreshToken,
);
router.post(
  "/logout",
  rateLimit({ windowMs: 60 * 1000, max: 30, keyPrefix: "logout" }),
  logout,
);
router.patch("/profile", authenticate, updateProfile);
router.get("/google", googleAuth);
router.get("/google/callback", googleCallback);

export default router;
