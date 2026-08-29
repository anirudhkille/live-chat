import { api } from "@/lib/api";
import type { ApiResponse, Conversation, Message } from "@/types/api";

export async function createConversation(
  userId: string
): Promise<ApiResponse<Conversation>> {
  const response = await api.post<ApiResponse<Conversation>>(`/conversation`, {
    userId,
  });
  return response.data;
}

export async function sendMessage(
  conversationId: string,
  content: string
): Promise<ApiResponse<Message>> {
  const response = await api.post<ApiResponse<Message>>(
    `/message/${conversationId}`,
    {
      content,
    }
  );
  return response.data;
}

export async function getMessages(
  conversationId: string,
  params?: { before?: string; limit?: number }
): Promise<ApiResponse<Message[]>> {
  const searchParams = new URLSearchParams();
  if (params?.before) searchParams.set("before", params.before);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const query = searchParams.toString();
  const url = query
    ? `/message/${conversationId}?${query}`
    : `/message/${conversationId}`;
  const response = await api.get<ApiResponse<Message[]>>(url);
  return response.data;
}

export async function getConversations(): Promise<ApiResponse<Conversation[]>> {
  const response = await api.get<ApiResponse<Conversation[]>>(`/conversation`);
  return response.data;
}

export async function getConversationById(
  conversationId: string
): Promise<ApiResponse<Conversation>> {
  const response = await api.get<ApiResponse<Conversation>>(
    `/conversation/${conversationId}`
  );
  return response.data;
}
