import express from "express";
import { validate } from "../../middleware/validate.middleware.js";
import {
  sendLoginOtp,
  verifyLoginOtp,
  refreshToken,
  logout,
} from "./auth.controller.js";
import { sendLoginOtpSchema, verifyLoginOtpSchema } from "./auth.schema.js";

const router = express.Router();

router.post("/send-login-otp", validate(sendLoginOtpSchema), sendLoginOtp);
router.post(
  "/verify-login-otp",
  validate(verifyLoginOtpSchema),
  verifyLoginOtp,
);
router.get("/refresh", refreshToken);
router.post("logout", logout);

export default router;
