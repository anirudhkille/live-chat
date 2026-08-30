import { api } from "@/lib/api";
import type { ApiResponse } from "@/types/api";

export async function getVapidPublicKey(): Promise<string> {
  const response = await api.get<ApiResponse<{ publicKey: string }>>(
    "/push/vapid-key"
  );
  return response.data.data.publicKey;
}

export type StoredPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function savePushSubscription(
  subscription: StoredPushSubscription
): Promise<void> {
  await api.post<ApiResponse>("/push/subscribe", subscription);
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await api.post<ApiResponse>("/push/unsubscribe", { endpoint });
}