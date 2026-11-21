import { z } from "zod";
import { emailSchema } from "../../utils/schemas.js";

const clientSchema = z.string().max(32).optional();

export const sendLoginOtpSchema = z.object({
  email: emailSchema,
});

export const verifyLoginOtpSchema = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{6}$/, "Otp must be exactly 6 digits"),
  client: clientSchema,
});

export const googleMobileLoginSchema = z.object({
  idToken: z.string().min(1).max(4096),
  client: clientSchema,
});

const refreshTokenValueSchema = z.string().trim().min(1).max(4096);

const emptyBodySchema = (shape) =>
  z.preprocess((value) => value ?? {}, z.object(shape));

export const refreshTokenSchema = emptyBodySchema({
  refreshToken: refreshTokenValueSchema.optional(),
  client: clientSchema,
});

export const logoutSchema = emptyBodySchema({
  refreshToken: refreshTokenValueSchema.optional(),
  client: clientSchema,
});

export const googleExchangeSchema = z.object({
  code: z.string().trim().min(1).max(512),
  client: clientSchema,
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});
