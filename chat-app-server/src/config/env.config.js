import "dotenv/config";
import { z } from "zod";
import { logger } from "./logger.js";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.coerce.number().default(8080),
  MONGO_URI: z.string(),
  JWT_SECRET: z.string(),
  ALLOWED_ORIGNS: z
    .string()
    .transform((value) => value.split(",").map((origin) => origin.trim())),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6367),
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_EMAIL: z.string(),
  SMTP_PASSWORD: z.string(),
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
