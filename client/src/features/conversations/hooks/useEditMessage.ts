import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/types/api";
import { editMessage } from "../api/conversation-api";

export type EditMessageInput = {
  messageId: string;
  content: string;
  cipherMeta?: Record<string, unknown>;
};

export function useEditMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, content, cipherMeta }: EditMessageInput) =>
      editMessage(messageId, content, cipherMeta),
    onSuccess: (_message, variables) => {
      // The edited text has fresh ciphertext, so any cached plaintext is
      // stale. Invalidate both the per-message preview and the conversation
      // list preview; the message list re-decrypts from the new signature.
      queryClient.invalidateQueries({
        queryKey: ["decrypted-preview", variables.messageId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Couldn't edit message"));
    },
  });
}
