import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/types/api";
import { removeMessage } from "../api/conversation-api";

export function useDeleteMessage() {
  return useMutation({
    mutationFn: (messageId: string) => removeMessage(messageId),
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Couldn't delete message"));
    },
  });
}
