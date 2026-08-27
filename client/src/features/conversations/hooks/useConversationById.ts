import { useQuery } from "@tanstack/react-query";
import { getConversationById } from "../api/conversation-api";

export function useGetConversationById(conversationId: string) {
  return useQuery({
    queryKey: ["converstion", conversationId],
    queryFn: () => getConversationById(conversationId),
    enabled: !!conversationId,
    select: (data) => data.data,
  });
}
