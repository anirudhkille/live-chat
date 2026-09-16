import { api } from "@/lib/api";
import type {
  ApiResponse,
  Conversation,
  GroupParticipant,
  Message,
} from "@/types/api";

export type GroupPhotoUploadUrl = {
  uploadUrl: string;
  key: string;
};

export async function createConversation(
  userId: string
): Promise<ApiResponse<Conversation>> {
  const response = await api.post<ApiResponse<Conversation>>(`/conversation`, {
    userId,
  });
  return response.data;
}

export async function createGroup(
  name: string,
  participantIds: string[],
  photoKey?: string
): Promise<ApiResponse<Conversation>> {
  const response = await api.post<ApiResponse<Conversation>>(
    `/conversation/group`,
    { name, participantIds, photoKey }
  );
  return response.data;
}

export async function getGroupPhotoUploadUrl(
  contentType: string
): Promise<ApiResponse<GroupPhotoUploadUrl>> {
  const response = await api.post<ApiResponse<GroupPhotoUploadUrl>>(
    `/conversation/group/photo-url`,
    { contentType }
  );
  return response.data;
}

export async function updateGroup(
  conversationId: string,
  payload: { name?: string; photoKey?: string }
): Promise<ApiResponse<Conversation>> {
  const response = await api.patch<ApiResponse<Conversation>>(
    `/conversation/${conversationId}`,
    payload
  );
  return response.data;
}

export async function deleteGroup(
  conversationId: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  const response = await api.delete<ApiResponse<{ deleted: boolean }>>(
    `/conversation/${conversationId}`
  );
  return response.data;
}

export async function removeGroupParticipant(
  conversationId: string,
  userId: string
): Promise<ApiResponse<{ removed: string }>> {
  const response = await api.delete<ApiResponse<{ removed: string }>>(
    `/conversation/${conversationId}/participants/${userId}`
  );
  return response.data;
}

export async function getGroupParticipants(
  conversationId: string
): Promise<ApiResponse<GroupParticipant[]>> {
  const response = await api.get<ApiResponse<GroupParticipant[]>>(
    `/conversation/${conversationId}/participants`
  );
  return response.data;
}

export async function addGroupParticipants(
  conversationId: string,
  participantIds: string[]
): Promise<ApiResponse<{ added: string[]; participants: GroupParticipant[] }>> {
  const response = await api.post<
    ApiResponse<{ added: string[]; participants: GroupParticipant[] }>
  >(`/conversation/${conversationId}/participants`, { participantIds });
  return response.data;
}

export async function sendMessage(
  conversationId: string,
  content: string,
  attachmentIds?: string[],
  replyToId?: string,
  cipherMeta?: Record<string, unknown> | null
): Promise<ApiResponse<Message>> {
  const response = await api.post<ApiResponse<Message>>(
    `/message/${conversationId}`,
    {
      content,
      ...(cipherMeta ? { cipherMeta } : {}),
      ...(attachmentIds?.length ? { attachmentIds } : {}),
      ...(replyToId ? { replyToId } : {}),
    }
  );
  return response.data;
}

export async function toggleReaction(
  messageId: string,
  emoji: string
): Promise<ApiResponse<Message>> {
  const response = await api.post<ApiResponse<Message>>(
    `/message/${messageId}/reactions`,
    { emoji }
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

export async function getConversationWithMessages(
  conversationId: string
): Promise<
  ApiResponse<{
    conversation: Conversation;
    messages: Message[];
    nextCursor: string | null;
  }>
> {
  const response = await api.get<
    ApiResponse<{
      conversation: Conversation;
      messages: Message[];
      nextCursor: string | null;
    }>
  >(`/conversation/${conversationId}/with-messages`);
  return response.data;
}

export async function markConversationRead(
  conversationId: string
): Promise<ApiResponse<{ conversationId: string; updatedCount: number }>> {
  const response = await api.post<
    ApiResponse<{ conversationId: string; updatedCount: number }>
  >(`/message/read/${conversationId}`);
  return response.data;
}

export async function editMessage(
  messageId: string,
  content: string
): Promise<ApiResponse<Message>> {
  const response = await api.patch<ApiResponse<Message>>(
    `/message/${messageId}`,
    {
      content,
    }
  );
  return response.data;
}

export async function removeMessage(
  messageId: string
): Promise<ApiResponse<Message>> {
  const response = await api.delete<ApiResponse<Message>>(
    `/message/${messageId}`
  );
  return response.data;
}
