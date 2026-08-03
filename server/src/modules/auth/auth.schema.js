import { z } from "zod";

export const sendLoginOtpSchema = z.object({
  email: z.string().min(1, "Email.can't be empty").email("Invalid email"),
});

export const verifyLoginOtpSchema = z.object({
  email: z.string().min(1, "Email.can't be empty").email("Invalid email"),
  otp: z
    .string()
    .min(1, "Otp can't be empty")
    .min(6, "Otp should contain 6 digit")
    .max(6, "Otp can't exceed 6 digit"),
});
