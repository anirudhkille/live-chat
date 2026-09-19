import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getApiErrorMessage } from "@/types/api";
import { createConversation } from "../api/conversation-api";

export function useCreateConversation() {
  const router = useRouter();

  return useMutation({
    mutationFn: (userId: string) => createConversation(userId),
    onSuccess: (result) => {
      router.push(`/chats/${result.data.id}`);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Couldn't start conversation"));
    },
  });
}
