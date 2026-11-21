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
  googleMobileLogin,
  googleExchange,
} from "./auth.controller.js";
import {
  sendLoginOtpSchema,
  verifyLoginOtpSchema,
  googleMobileLoginSchema,
  googleExchangeSchema,
  refreshTokenSchema,
  logoutSchema,
  updateProfileSchema,
} from "./auth.schema.js";
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
  "/refresh",
  rateLimit({ windowMs: 60 * 1000, max: 30, keyPrefix: "refresh" }),
  validate(refreshTokenSchema),
  refreshToken,
);
router.post(
  "/logout",
  rateLimit({ windowMs: 60 * 1000, max: 30, keyPrefix: "logout" }),
  validate(logoutSchema),
  logout,
);
router.patch(
  "/profile",
  authenticate,
  rateLimit({ windowMs: 60 * 1000, max: 30, keyPrefix: "profile" }),
  validate(updateProfileSchema),
  updateProfile,
);
router.post(
  "/google/mobile",
  rateLimit({ windowMs: 60 * 1000, max: 10, keyPrefix: "google-mobile" }),
  validate(googleMobileLoginSchema),
  googleMobileLogin,
);
router.post(
  "/google/exchange",
  rateLimit({ windowMs: 60 * 1000, max: 10, keyPrefix: "google-exchange" }),
  validate(googleExchangeSchema),
  googleExchange,
);
router.get(
  "/google",
  rateLimit({ windowMs: 60 * 1000, max: 30, keyPrefix: "google-oauth" }),
  googleAuth,
);
router.get(
  "/google/callback",
  rateLimit({ windowMs: 60 * 1000, max: 30, keyPrefix: "google-oauth" }),
  googleCallback,
);

export default router;
