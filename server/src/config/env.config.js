import "dotenv/config";
import { z } from "zod";
import { logger } from "./logger.js";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string(),
  ALLOWED_ORIGNS: z
    .string()
    .transform((value) => value.split(",").map((origin) => origin.trim())),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CALLBACK_URL: z.string(),
  CLIENT_URL: z.string(),
  SERVER_URL: z.string().default("http://localhost:8080"),
  RESEND_API_KEY: z.string(),
  EMAIL_FROM: z.string().default("onboarding@resend.dev"),
  R2_ACCOUNT_ID: z.string(),
  R2_ACCESS_KEY_ID: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),
  R2_BUCKET: z.string(),
  R2_PUBLIC_URL: z.string(),
  VAPID_SUBJECT: z.string(),
  VAPID_PUBLIC_KEY: z.string(),
  VAPID_PRIVATE_KEY: z.string(),
  SENTRY_DSN: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  logger.error("Invalid environment variables");

  result.error.issues.forEach((issue) =>
    logger.error(`${issue.path.join(", ")} ${issue.message}`),
  );
  process.exit(1);
}

export const env = result.data;
