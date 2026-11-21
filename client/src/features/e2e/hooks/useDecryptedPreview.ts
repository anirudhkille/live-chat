import { useQuery } from "@tanstack/react-query";
import { useE2EIdentity } from "./useE2EIdentity";
import { usePeerPublicKey } from "./usePeerPublicKey";
import { deriveConversationKey } from "@/lib/crypto/conversationKey";
import { decryptGroupMessage, decryptMessage } from "@/lib/crypto/messaging";
import { useAuthStore } from "@/store/auth-store";
import type { Message } from "@/types/api";

export function useDecryptedPreview(
  message: Message | null | undefined,
  peerId: string | null
) {
  const { keys } = useE2EIdentity();
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const isGroup = message?.cipherMeta?.mode === "group";
  // For a group preview the relevant key belongs to the sender; for a DM it is
  // the other participant.
  const peerKeyId = isGroup
    ? message && message.senderId !== currentUserId
      ? message.senderId
      : null
    : peerId;
  const { data: peerPublicKey } = usePeerPublicKey(peerKeyId);

  return useQuery({
    queryKey: [
      "decrypted-preview",
      message?.id,
      peerId,
      currentUserId,
      message?.updatedAt,
    ],
    queryFn: async () => {
      if (!message?.cipherMeta || !keys) return null;
      try {
        if (message.cipherMeta.mode === "group") {
          if (!currentUserId) return null;
          const senderPublicKey =
            message.senderId === currentUserId ? keys.publicKey : peerPublicKey;
          if (!senderPublicKey) return null;
          return await decryptGroupMessage({
            privateKey: keys.privateKey,
            conversationId: message.conversationId,
            senderPublicKey,
            recipientId: currentUserId,
            cipherMeta: message.cipherMeta,
          });
        }

        if (!peerPublicKey) return null;
        const conversationKey = deriveConversationKey({
          privateKey: keys.privateKey,
          peerPublicKey,
          conversationId: message.conversationId,
        });
        return await decryptMessage(
          conversationKey,
          message.content,
          message.cipherMeta ?? null
        );
      } catch {
        return null;
      }
    },
    enabled:
      !!message?.cipherMeta &&
      !!keys &&
      (isGroup
        ? !!currentUserId &&
          (message?.senderId === currentUserId || !!peerPublicKey)
        : !!peerPublicKey),
    staleTime: Infinity,
  });
}
