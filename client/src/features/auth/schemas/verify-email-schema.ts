import { z } from "zod";

export const verifyEmailSchema = z.object({
  email: z
    .string()
    .min(1, "Email can't be empty")
    .pipe(z.email("Enter a valid email")),
  otp: z
    .string()
    .min(6, "Otp should contain 6 digits")
    .max(6, "Otp can't exceed 6 digits"),
});

export type VerifyEmailValues = z.infer<typeof verifyEmailSchema>;
