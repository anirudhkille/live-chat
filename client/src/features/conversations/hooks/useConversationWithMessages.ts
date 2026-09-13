import { useQuery } from "@tanstack/react-query";
import { getConversationWithMessages } from "../api/conversation-api";

export function useConversationWithMessages(conversationId: string) {
  return useQuery({
    queryKey: ["conversation-with-messages", conversationId],
    queryFn: () => getConversationWithMessages(conversationId),
    enabled: !!conversationId,
    staleTime: 30 * 1000,
    select: (data) => data.data,
  });
}
