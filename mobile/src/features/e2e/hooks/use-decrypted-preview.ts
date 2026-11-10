import { useQuery } from "@tanstack/react-query";

import { deriveConversationKey } from "@/lib/crypto/conversation-key";
import { decryptMessage } from "@/lib/crypto/messaging";
import type { Message } from "@/types/api";

import { useE2EIdentity } from "./use-e2e-identity";
import { usePeerPublicKey } from "./use-peer-public-key";

export function useDecryptedPreview(
  message: Message | null | undefined,
  peerId: string | null,
) {
  const { keys, status } = useE2EIdentity();
  const peerKeyQuery = usePeerPublicKey(peerId);
  const peerPublicKey = peerKeyQuery.data ?? null;
  const isEncrypted = Boolean(message?.cipherMeta);
  const canDecrypt = Boolean(isEncrypted && message && keys && peerPublicKey);

  const previewQuery = useQuery({
    queryKey: [
      "e2e-preview",
      message?.conversationId,
      message?.id,
      message?.content,
      message?.cipherMeta?.iv,
    ],
    queryFn: async () => {
      if (!message?.cipherMeta || !keys || !peerPublicKey) return null;

      try {
        const conversationKey = deriveConversationKey({
          privateKey: keys.privateKey,
          peerPublicKey,
          conversationId: message.conversationId,
        });

        return await decryptMessage(
          conversationKey,
          message.content,
          message.cipherMeta,
        );
      } catch {
        return null;
      }
    },
    enabled: canDecrypt,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    retry: false,
  });

  const preparing =
    status === "loading" || (peerId ? peerKeyQuery.isPending : false);

  return {
    isEncrypted,
    isPreparing:
      isEncrypted && (preparing || (canDecrypt && previewQuery.isPending)),
    preview: previewQuery.data ?? null,
  };
}
