import { asyncHandler } from "../../utils/asyncHandler.js";
import { sendResponse } from "../../utils/response.js";
import * as pushService from "./push.service.js";

export const subscribe = asyncHandler(async (req, res) => {
  const subscription = await pushService.saveSubscription(req.user.id, req.body);
  sendResponse(res, 200, "Push subscription saved", subscription);
});

export const unsubscribe = asyncHandler(async (req, res) => {
  await pushService.removeSubscription(req.user.id, req.body.endpoint);
  sendResponse(res, 200, "Push subscription removed");
});

export const vapidKey = asyncHandler(async (req, res) => {
  sendResponse(res, 200, "VAPID public key", {
    publicKey: pushService.getPublicKey(),
  });
});