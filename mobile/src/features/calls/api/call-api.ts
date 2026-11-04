import { api } from "@/lib/api";
import type { ApiResponse, CallLog } from "@/types/api";

export const callApi = {
  list: async () => {
    const { data } = await api.get<ApiResponse<CallLog[]>>(`/call`);
    return data.data;
  },
};