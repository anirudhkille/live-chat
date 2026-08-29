import { z } from "zod";
import { env } from "../../config/env.config.js";
import { logger } from "../../config/logger.js";
import { webpush } from "../../config/push.js";
import { AppError } from "../../utils/AppError.js";
import * as pushRepository from "./push.repository.js";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const saveSubscription = async (userId, input) => {
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("Invalid push subscription", 400);
  }

  const subscription = await pushRepository.upsertSubscription({
    userId,
    endpoint: parsed.data.endpoint,
    keys: parsed.data.keys,
  });
  return subscription;
};

export const removeSubscription = async (userId, endpoint) => {
  if (typeof endpoint !== "string" || !endpoint) {
    throw new AppError("Endpoint is required", 400);
  }
  await pushRepository.deleteSubscription(userId, endpoint);
  return true;
};

export const getPublicKey = () => env.VAPID_PUBLIC_KEY;

export const sendMessageNotification = async ({
  userId,
  senderName,
  conversationId,
  content,
  attachmentCount,
}) => {
  let subscriptions;
  try {
    subscriptions = await pushRepository.getSubscriptionsByUserId(userId);
  } catch (error) {
    logger.error(
      { err: error.message, userId },
      "Failed to load push subscriptions",
    );
    return;
  }

  if (subscriptions.length === 0) return;

  let body = typeof content === "string" && content.trim() ? content.trim() : "";
  if (!body) {
    body =
      attachmentCount > 0
        ? attachmentCount === 1
          ? "Shared a photo or file"
          : `Shared ${attachmentCount} items`
        : "New message";
  }

  const payload = {
    title: senderName || "New message",
    body,
    url: `/chats/${conversationId}`,
  };

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: subscription.keys },
          JSON.stringify(payload),
          { TTL: 86400 },
        );
      } catch (error) {
        const statusCode = error?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          logger.info(
            { userId, endpoint: subscription.endpoint },
            "Expired push subscription removed",
          );
          await pushRepository.deleteSubscription(userId, subscription.endpoint);
        } else {
          logger.error(
            { err: error.message, statusCode, userId },
            "Web push send failed",
          );
        }
      }
    }),
  );
};