import { useQuery } from "@tanstack/react-query";
import { useE2EIdentity } from "./useE2EIdentity";
import { usePeerPublicKey } from "./usePeerPublicKey";
import { deriveConversationKey } from "@/lib/crypto/conversationKey";
import { decryptMessage } from "@/lib/crypto/messaging";
import type { Message } from "@/types/api";

export function useDecryptedPreview(
  message: Message | null | undefined,
  peerId: string | null
) {
  const { keys } = useE2EIdentity();
  const { data: peerPublicKey } = usePeerPublicKey(peerId);

  return useQuery({
    queryKey: ["decrypted-preview", message?.id, peerId],
    queryFn: async () => {
      if (!message?.cipherMeta) return null;
      if (!keys || !peerPublicKey) return "Message";
      try {
        const conversationKey = deriveConversationKey({
          privateKey: keys.privateKey,
          peerPublicKey,
          conversationId: message.conversationId,
        });
        const plaintext = await decryptMessage(
          conversationKey,
          message.content,
          message.cipherMeta ?? null
        );
        return plaintext ?? "Message";
      } catch {
        return "Message";
      }
    },
    enabled: !!message?.cipherMeta,
    staleTime: Infinity,
  });
}
