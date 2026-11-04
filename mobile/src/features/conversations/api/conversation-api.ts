import { api } from "@/lib/api";
import type { ApiResponse, Conversation } from "@/types/api";

export const conversationApi = {
  list: async () => {
    const { data } = await api.get<ApiResponse<Conversation[]>>("/conversation");
    return data.data;
  },
};