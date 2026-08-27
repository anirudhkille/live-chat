import { useQuery } from "@tanstack/react-query";
import { getConversations } from "../api/conversation-api";

export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: getConversations,
    select: (data) => data.data,
  });
}
