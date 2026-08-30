import { useMutation } from "@tanstack/react-query";
import { toggleReaction } from "../api/conversation-api";

export function useToggleReaction() {
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      toggleReaction(messageId, emoji),
  });
}