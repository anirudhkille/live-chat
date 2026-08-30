"use client";

import { useQuery } from "@tanstack/react-query";
import { getGroupParticipants } from "../api/conversation-api";

export function useGroupParticipants(conversationId: string) {
  return useQuery({
    queryKey: ["group-participants", conversationId],
    queryFn: () => getGroupParticipants(conversationId),
    enabled: Boolean(conversationId),
    select: (data) => data.data,
  });
}