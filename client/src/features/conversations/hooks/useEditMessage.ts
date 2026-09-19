import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/types/api";
import { editMessage } from "../api/conversation-api";

export type EditMessageInput = {
  messageId: string;
  content: string;
};

export function useEditMessage() {
  return useMutation({
    mutationFn: ({ messageId, content }: EditMessageInput) =>
      editMessage(messageId, content),
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Couldn't edit message"));
    },
  });
}
