import { useMutation } from "@tanstack/react-query";
import { sendMessage } from "../api/conversation-api";

type SendMessageInput = { conversationId: string; content: string };

export function useSendMessage() {
  return useMutation({
    mutationFn: ({ conversationId, content }: SendMessageInput) =>
      sendMessage(conversationId, content),
  });
}
