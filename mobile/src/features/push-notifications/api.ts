import { api } from "@/lib/api";
import type { ApiResponse } from "@/types/api";

export const pushApi = {
  vapidKey: async () => {
    const { data } = await api.get<ApiResponse<{ publicKey: string }>>(`/push/vapid-key`);
    return data.data.publicKey;
  },
  subscribe: async (subscription: unknown) => {
    const { data } = await api.post<ApiResponse<null>>(`/push/subscribe`, subscription);
    return data;
  },
  unsubscribe: async (endpoint: string) => {
    const { data } = await api.post<ApiResponse<null>>(`/push/unsubscribe`, { endpoint });
    return data;
  },
};