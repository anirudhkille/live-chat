"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createGroup } from "../api/conversation-api";
import { getApiErrorMessage } from "@/types/api";

export function useCreateGroup() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { name: string; participantIds: string[] }) =>
      createGroup(payload.name, payload.participantIds),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      router.push(`/chats/${result.data.id}`);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Couldn't create the group"));
    },
  });
}