import { z } from "zod";
import { emailSchema } from "../../utils/schemas.js";

export const sendLoginOtpSchema = z.object({
  email: emailSchema,
});

export const verifyLoginOtpSchema = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{6}$/, "Otp must be exactly 6 digits"),
});
