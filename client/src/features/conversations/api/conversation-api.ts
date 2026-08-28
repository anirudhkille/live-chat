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
  conversationId: string
): Promise<ApiResponse<Message[]>> {
  const response = await api.get<ApiResponse<Message[]>>(
    `/message/${conversationId}`
  );
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
