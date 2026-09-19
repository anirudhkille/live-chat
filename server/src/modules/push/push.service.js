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
    throw new AppError(400, "Invalid push subscription");
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
    throw new AppError(400, "Endpoint is required");
  }
  await pushRepository.deleteSubscription(userId, endpoint);
  return true;
};

export const getPublicKey = () => env.VAPID_PUBLIC_KEY;

const deliver = async (subscriptions, userId, payload, options) => {
  if (subscriptions.length === 0) return;

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: subscription.keys },
          JSON.stringify(payload),
          options,
        );
      } catch (error) {
        const statusCode = error?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          logger.info(
            { userId, endpoint: subscription.endpoint },
            "Expired push subscription removed",
          );
          await pushRepository.deleteSubscription(
            userId,
            subscription.endpoint,
          );
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

const sendToSubscriptions = async (userId, payload, options, subscriptions) => {
  let list = subscriptions;
  if (!list) {
    try {
      list = await pushRepository.getSubscriptionsByUserId(userId);
    } catch (error) {
      logger.error(
        { err: error.message, userId },
        "Failed to load push subscriptions",
      );
      return;
    }
  }
  await deliver(list, userId, payload, options);
};

const buildMessagePayload = ({
  senderName,
  conversationId,
  content,
  attachmentCount,
  isAudio,
  isEncrypted,
}) => {
  let body = "";
  if (!isEncrypted && typeof content === "string" && content.trim()) {
    body = content.trim();
  }
  if (!body) {
    body = isAudio
      ? "Voice message"
      : attachmentCount > 0
        ? attachmentCount === 1
          ? "Shared a photo or file"
          : `Shared ${attachmentCount} items`
        : "Sent a message";
  }

  return {
    title: senderName || "New message",
    body,
    url: `/chats/${conversationId}`,
  };
};

export const sendMessageNotification = async ({
  userId,
  senderName,
  conversationId,
  content,
  attachmentCount,
  isAudio,
  isEncrypted = false,
}) => {
  const payload = buildMessagePayload({
    senderName,
    conversationId,
    content,
    attachmentCount,
    isAudio,
    isEncrypted,
  });

  await sendToSubscriptions(userId, payload, { TTL: 86400 });
};

export const sendBulkMessageNotifications = async (notifications) => {
  const active = notifications.filter((notification) => notification.userId);
  if (active.length === 0) return;

  let subscriptions;
  try {
    subscriptions = await pushRepository.getSubscriptionsByUserIds(
      active.map((notification) => notification.userId),
    );
  } catch (error) {
    logger.error({ err: error.message }, "Failed to load push subscriptions");
    return;
  }

  const grouped = new Map();
  for (const subscription of subscriptions) {
    const list = grouped.get(subscription.userId) ?? [];
    list.push(subscription);
    grouped.set(subscription.userId, list);
  }

  await Promise.allSettled(
    active.map(async (notification) => {
      const list = grouped.get(notification.userId);
      if (!list?.length) return;
      const payload = buildMessagePayload(notification);
      await deliver(list, notification.userId, payload, { TTL: 86400 });
    }),
  );
};

export const sendCallNotification = async ({
  userId,
  callerName,
  conversationId,
  callType,
  callId,
}) => {
  const payload = {
    type: "call",
    title: `Incoming ${callType === "video" ? "video" : "voice"} call`,
    body: `${callerName || "Someone"} is calling you`,
    url: `/chats/${conversationId}`,
    conversationId,
    callId,
    callType,
    callerName: callerName ?? null,
  };

  await sendToSubscriptions(userId, payload, { TTL: 120, urgency: "high" });
};
