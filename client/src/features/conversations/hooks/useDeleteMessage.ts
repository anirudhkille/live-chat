import { useMutation } from "@tanstack/react-query";
import { removeMessage } from "../api/conversation-api";

export function useDeleteMessage() {
  return useMutation({
    mutationFn: (messageId: string) => removeMessage(messageId),
  });
}