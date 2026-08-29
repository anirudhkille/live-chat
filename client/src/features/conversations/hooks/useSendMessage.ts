import { useMutation } from "@tanstack/react-query";
import { sendMessage } from "../api/conversation-api";

export type SendMessageInput = {
  conversationId: string;
  content: string;
  attachmentIds?: string[];
};

export function useSendMessage() {
  return useMutation({
    mutationFn: ({ conversationId, content, attachmentIds }: SendMessageInput) =>
      sendMessage(conversationId, content, attachmentIds),
  });
}