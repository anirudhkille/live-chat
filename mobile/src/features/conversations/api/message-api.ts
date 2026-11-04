import { api } from "@/lib/api";
import type { ApiResponse, Message, MessagePage } from "@/types/api";

export const messageApi = {
  list: async (conversationId: string) => {
    const { data } = await api.get<ApiResponse<Message[] | MessagePage>>(
      `/message/${conversationId}`,
    );
    const payload = data.data;
    if (Array.isArray(payload)) return payload;
    return payload.messages ?? [];
  },
  send: async (conversationId: string, content: string) => {
    const { data } = await api.post<ApiResponse<Message>>(
      `/message/${conversationId}`,
      { content },
    );
    return data.data;
  },
};