import { useMutation } from "@tanstack/react-query";
import { sendMessage } from "../api/conversation-api";

export type SendMessageInput = {
  conversationId: string;
  content: string;
  attachmentIds?: string[];
  replyToId?: string;
};

export function useSendMessage() {
  return useMutation({
    mutationFn: ({
      conversationId,
      content,
      attachmentIds,
      replyToId,
    }: SendMessageInput) =>
      sendMessage(conversationId, content, attachmentIds, replyToId),
  });
}