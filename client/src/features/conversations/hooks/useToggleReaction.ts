import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/types/api";
import { toggleReaction } from "../api/conversation-api";

export function useToggleReaction() {
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      toggleReaction(messageId, emoji),
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Couldn't update reaction"));
    },
  });
}
