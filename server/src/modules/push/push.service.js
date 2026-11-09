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

const expoTokenSchema = z.object({
  token: z.string().min(1),
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

export const saveExpoToken = async (userId, tokenInput) => {
  const parsed = expoTokenSchema.safeParse({ token: tokenInput });
  if (!parsed.success) {
    throw new AppError(400, "Invalid Expo push token");
  }
  const token = await pushRepository.upsertExpoPushToken({
    userId,
    token: parsed.data.token,
  });
  return token;
};

export const removeExpoToken = async (userId, token) => {
  if (typeof token !== "string" || !token) {
    throw new AppError(400, "Token is required");
  }
  await pushRepository.deleteExpoPushToken(userId, token);
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

const sendToExpoTokens = async (tokens, payload, options) => {
  if (!tokens || tokens.length === 0) return;
  const list = tokens.map((t) => t.token ?? t);
  const messages = list.map((token) => ({
    to: token,
    title: payload.title,
    body: payload.body,
    data: {
      url: payload.url,
      conversationId: payload.conversationId,
      callId: payload.callId,
      type: payload.type,
    },
    sound: "default",
    priority:
      options?.urgency === "high" || options?.priority === "high"
        ? "high"
        : "default",
    ttl: options?.TTL,
  }));

  const chunkSize = 100;
  for (let i = 0; i < messages.length; i += chunkSize) {
    const chunk = messages.slice(i, i + chunkSize);
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });
      const json = await response.json();
      const results = Array.isArray(json?.data) ? json.data : [];
      results.forEach((result, index) => {
        if (result?.status === "error") {
          const token = chunk[index]?.to;
          if (result?.details?.error === "DeviceNotRegistered" && token) {
            pushRepository.deleteExpoPushTokenByToken(token).catch(() => {});
          } else {
            logger.error(
              { err: result?.message, token },
              "Expo push send failed",
            );
          }
        }
      });
    } catch (error) {
      logger.error({ err: error.message }, "Expo push request failed");
    }
  }
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

  try {
    const expoTokens = await pushRepository.getExpoPushTokensByUserId(userId);
    await sendToExpoTokens(expoTokens, payload, { TTL: 86400 });
  } catch (error) {
    logger.error(
      { err: error.message, userId },
      "Failed to load Expo push tokens",
    );
  }
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

  let expoTokens = [];
  try {
    expoTokens = await pushRepository.getExpoPushTokensByUserIds(
      active.map((notification) => notification.userId),
    );
  } catch (error) {
    logger.error({ err: error.message }, "Failed to load Expo push tokens");
  }

  const grouped = new Map();
  for (const subscription of subscriptions) {
    const list = grouped.get(subscription.userId) ?? [];
    list.push(subscription);
    grouped.set(subscription.userId, list);
  }

  const expoGrouped = new Map();
  for (const token of expoTokens) {
    const list = expoGrouped.get(token.userId) ?? [];
    list.push(token);
    expoGrouped.set(token.userId, list);
  }

  await Promise.allSettled(
    active.map(async (notification) => {
      const list = grouped.get(notification.userId);
      const payload = buildMessagePayload(notification);
      if (list?.length) {
        await deliver(list, notification.userId, payload, { TTL: 86400 });
      }
      const expoList = expoGrouped.get(notification.userId);
      if (expoList?.length) {
        await sendToExpoTokens(expoList, payload, { TTL: 86400 });
      }
    }),
  );
};

export const sendCallNotification = async ({
  userId,
  callerName,
  conversationId,
  callType,
  callId,
  isGroup = false,
  conversationName = null,
}) => {
  const kind = callType === "video" ? "video" : "voice";
  const caller = callerName || "Someone";
  const payload = {
    type: "call",
    title: isGroup ? `Incoming group ${kind} call` : `Incoming ${kind} call`,
    body: isGroup
      ? `${caller} started a ${kind} call${
          conversationName ? ` in ${conversationName}` : ""
        }`
      : `${caller} is calling you`,
    url: `/chats/${conversationId}`,
    conversationId,
    callId,
    callType,
    callerName: callerName ?? null,
    isGroup,
    conversationName: conversationName ?? null,
  };

  await sendToSubscriptions(userId, payload, { TTL: 120, urgency: "high" });

  try {
    const expoTokens = await pushRepository.getExpoPushTokensByUserId(userId);
    await sendToExpoTokens(expoTokens, payload, {
      TTL: 120,
      urgency: "high",
    });
  } catch (error) {
    logger.error(
      { err: error.message, userId },
      "Failed to load Expo push tokens",
    );
  }
};
