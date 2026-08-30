"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addGroupParticipants } from "../api/conversation-api";
import { getApiErrorMessage } from "@/types/api";

export function useAddGroupParticipants(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (participantIds: string[]) =>
      addGroupParticipants(conversationId, participantIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["group-participants", conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Couldn't add members"));
    },
  });
}