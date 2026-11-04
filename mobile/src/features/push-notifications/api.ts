import { api } from "@/lib/api";
import type { ApiResponse } from "@/types/api";

export const pushApi = {
  subscribe: async (subscription: unknown) => {
    const { data } = await api.post<ApiResponse<null>>(`/push/subscribe`, subscription);
    return data;
  },
};