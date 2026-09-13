import { useQuery } from "@tanstack/react-query";
import { getConversations } from "../api/conversation-api";

export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: getConversations,
    staleTime: 30 * 1000,
    select: (data) => data.data,
  });
}
