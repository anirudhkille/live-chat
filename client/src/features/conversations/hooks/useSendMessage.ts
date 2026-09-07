import { useMutation } from "@tanstack/react-query";
import { sendMessage } from "../api/conversation-api";

export type SendMessageInput = {
  conversationId: string;
  content: string;
  attachmentIds?: string[];
  replyToId?: string;
  cipherMeta?: Record<string, unknown>;
};

export function useSendMessage() {
  return useMutation({
    mutationFn: ({
      conversationId,
      content,
      attachmentIds,
      replyToId,
      cipherMeta,
    }: SendMessageInput) =>
      sendMessage(
        conversationId,
        content,
        attachmentIds,
        replyToId,
        cipherMeta
      ),
  });
}
