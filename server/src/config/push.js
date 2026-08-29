import webpush from "web-push";
import { env } from "./env.config.js";
import { logger } from "./logger.js";

webpush.setVapidDetails(
  env.VAPID_SUBJECT,
  env.VAPID_PUBLIC_KEY,
  env.VAPID_PRIVATE_KEY,
);
logger.info("Web Push initialized");

export { webpush };