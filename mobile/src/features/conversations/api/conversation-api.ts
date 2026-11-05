import { api } from "@/lib/api";
import type {
  ApiResponse,
  Conversation,
  GroupParticipant,
  Message,
} from "@/types/api";

export type GroupPhotoUploadUrl = { uploadUrl: string; key: string };

export const conversationApi = {
  list: async () => {
    const { data } =
      await api.get<ApiResponse<Conversation[]>>(`/conversation`);
    return data.data;
  },
  getById: async (conversationId: string) => {
    const { data } = await api.get<ApiResponse<Conversation>>(
      `/conversation/${conversationId}`,
    );
    return data.data;
  },
  getWithMessages: async (conversationId: string) => {
    const { data } = await api.get<
      ApiResponse<{
        conversation: Conversation;
        messages: Message[];
        nextCursor: string | null;
      }>
    >(`/conversation/${conversationId}/with-messages`);
    return data.data;
  },
  create: async (userId: string) => {
    const { data } = await api.post<ApiResponse<Conversation>>(
      `/conversation`,
      { userId },
    );
    return data.data;
  },
  createGroup: async (
    name: string,
    participantIds: string[],
    photoKey?: string,
  ) => {
    const { data } = await api.post<ApiResponse<Conversation>>(
      `/conversation/group`,
      {
        name,
        participantIds,
        photoKey,
      },
    );
    return data.data;
  },
  getGroupPhotoUploadUrl: async (contentType: string) => {
    const { data } = await api.post<ApiResponse<GroupPhotoUploadUrl>>(
      `/conversation/group/photo-url`,
      {
        contentType,
      },
    );
    return data.data;
  },
  updateGroup: async (
    conversationId: string,
    payload: { name?: string; photoKey?: string },
  ) => {
    const { data } = await api.patch<ApiResponse<Conversation>>(
      `/conversation/${conversationId}`,
      payload,
    );
    return data.data;
  },
  deleteGroup: async (conversationId: string) => {
    const { data } = await api.delete<ApiResponse<{ deleted: boolean }>>(
      `/conversation/${conversationId}`,
    );
    return data.data;
  },
  getParticipants: async (conversationId: string) => {
    const { data } = await api.get<ApiResponse<GroupParticipant[]>>(
      `/conversation/${conversationId}/participants`,
    );
    return data.data;
  },
  addParticipants: async (conversationId: string, participantIds: string[]) => {
    const { data } = await api.post<
      ApiResponse<{ added: string[]; participants: GroupParticipant[] }>
    >(`/conversation/${conversationId}/participants`, { participantIds });
    return data.data;
  },
  removeParticipant: async (conversationId: string, userId: string) => {
    const { data } = await api.delete<ApiResponse<{ removed: string }>>(
      `/conversation/${conversationId}/participants/${userId}`,
    );
    return data.data;
  },
};

export const messageApi = {
  list: async (
    conversationId: string,
    params?: { before?: string; limit?: number },
  ) => {
    const search = new URLSearchParams();
    if (params?.before) search.set("before", params.before);
    if (params?.limit) search.set("limit", String(params.limit));
    const q = search.toString();
    const url = q
      ? `/message/${conversationId}?${q}`
      : `/message/${conversationId}`;
    const { data } = await api.get<ApiResponse<Message[]>>(url);
    return data.data;
  },
  send: async (
    conversationId: string,
    content: string,
    opts?: {
      attachmentIds?: string[];
      replyToId?: string;
      cipherMeta?: Record<string, unknown> | null;
    },
  ) => {
    const { data } = await api.post<ApiResponse<Message>>(
      `/message/${conversationId}`,
      {
        content,
        ...(opts?.cipherMeta ? { cipherMeta: opts.cipherMeta } : {}),
        ...(opts?.attachmentIds?.length
          ? { attachmentIds: opts.attachmentIds }
          : {}),
        ...(opts?.replyToId ? { replyToId: opts.replyToId } : {}),
      },
    );
    return data.data;
  },
  markRead: async (conversationId: string) => {
    const { data } = await api.post<
      ApiResponse<{ conversationId: string; updatedCount: number }>
    >(`/message/read/${conversationId}`);
    return data.data;
  },
  edit: async (messageId: string, content: string) => {
    const { data } = await api.patch<ApiResponse<Message>>(
      `/message/${messageId}`,
      { content },
    );
    return data.data;
  },
  remove: async (messageId: string) => {
    const { data } = await api.delete<ApiResponse<Message>>(
      `/message/${messageId}`,
    );
    return data.data;
  },
  toggleReaction: async (messageId: string, emoji: string) => {
    const { data } = await api.post<ApiResponse<Message>>(
      `/message/${messageId}/reactions`,
      { emoji },
    );
    return data.data;
  },
};
