import { useQuery } from "@tanstack/react-query";
import { getMessages } from "../api/conversation-api";

export function useGetMessages(conversationId: string) {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => getMessages(conversationId),
    enabled: !!conversationId,
    select: (data) => data.data,
  });
}
