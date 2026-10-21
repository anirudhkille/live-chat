import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markConversationRead } from "../api/conversation-api";
import type { ApiResponse, Conversation } from "@/types/api";

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      markConversationRead(conversationId),
    onSuccess: (_data, conversationId) => {
      // The conversation is open, so its badge is known to be zero. Patch that
      // one entry rather than invalidating, which would refetch every
      // conversation (and each one's participants and last message).
      queryClient.setQueryData<ApiResponse<Conversation[]>>(
        ["conversations"],
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((conversation) =>
              conversation.id === conversationId
                ? { ...conversation, unreadCount: 0 }
                : conversation
            ),
          };
        }
      );
    },
  });
}
