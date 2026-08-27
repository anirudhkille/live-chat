import { useMutation } from "@tanstack/react-query";
import { createConversation } from "../api/conversation-api";
import { useRouter } from "next/navigation";

export function useCreateConversation() {
  const router = useRouter();

  return useMutation({
    mutationFn: (userId: string) => createConversation(userId),
    onSuccess: (result) => {
      router.push(`/chats/${result.data.id}`);
    },
  });
}
