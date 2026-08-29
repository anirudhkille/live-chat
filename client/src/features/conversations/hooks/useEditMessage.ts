import { useMutation } from "@tanstack/react-query";
import { editMessage } from "../api/conversation-api";

export type EditMessageInput = {
  messageId: string;
  content: string;
};

export function useEditMessage() {
  return useMutation({
    mutationFn: ({ messageId, content }: EditMessageInput) =>
      editMessage(messageId, content),
  });
}