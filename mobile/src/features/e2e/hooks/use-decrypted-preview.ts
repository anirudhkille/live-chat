import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/store/auth-store";
import { deriveConversationKey } from "@/lib/crypto/conversation-key";
import { decryptGroupMessage, decryptMessage } from "@/lib/crypto/messaging";
import type { Message } from "@/types/api";

import { useE2EIdentity } from "./use-e2e-identity";
import { usePeerPublicKey } from "./use-peer-public-key";

export const ENCRYPTED_MESSAGE_PREVIEW = "Encrypted message";

type DecryptedPreviewArgs = {
  message: Message | null | undefined;
  peerId: string | null;
};

/**
 * Decrypts the latest message for the conversation list. Group rows use the
 * sender's public key and the current user's recipient entry, exactly like the
 * chat screen, so group previews are not shown as undecryptable.
 */
export function useDecryptedPreview({ message, peerId }: DecryptedPreviewArgs) {
  const { keys, status } = useE2EIdentity();
  const currentUserId = useAuthStore((state) => state.user?.id ?? null);
  const isEncrypted = Boolean(message?.cipherMeta);
  const isGroupMessage = isEncrypted && message?.cipherMeta?.mode === "group";

  const needsSenderKey =
    isGroupMessage && message?.senderId !== currentUserId
      ? (message?.senderId ?? null)
      : null;
  const senderKeyQuery = usePeerPublicKey(needsSenderKey);
  const peerKeyQuery = usePeerPublicKey(isGroupMessage ? null : peerId);

  const senderPublicKey = isGroupMessage
    ? message?.senderId === currentUserId
      ? (keys?.publicKey ?? null)
      : (senderKeyQuery.data ?? null)
    : (peerKeyQuery.data ?? null);

  const canDecrypt = Boolean(
    isEncrypted &&
    message &&
    keys &&
    senderPublicKey &&
    (isGroupMessage ? currentUserId : true),
  );

  const previewQuery = useQuery({
    queryKey: [
      "e2e-preview",
      message?.conversationId,
      message?.id,
      message?.content,
      message?.cipherMeta?.iv,
      message?.cipherMeta?.mode ?? "dm",
      senderPublicKey,
    ],
    queryFn: async () => {
      if (!message?.cipherMeta || !keys || !senderPublicKey) return null;

      try {
        if (message.cipherMeta.mode === "group") {
          if (!currentUserId) return null;
          return await decryptGroupMessage({
            privateKey: keys.privateKey,
            conversationId: message.conversationId,
            senderPublicKey,
            recipientId: currentUserId,
            cipherMeta: message.cipherMeta,
          });
        }

        const conversationKey = deriveConversationKey({
          privateKey: keys.privateKey,
          peerPublicKey: senderPublicKey,
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

  const preparingMessage =
    isGroupMessage && needsSenderKey
      ? senderKeyQuery.isPending
      : !isGroupMessage && peerId
        ? peerKeyQuery.isPending
        : false;

  const preparing = status === "loading" || preparingMessage;

  return {
    isEncrypted,
    canDecrypt,
    isPreparing:
      isEncrypted && (preparing || (canDecrypt && previewQuery.isPending)),
    preview: previewQuery.data ?? null,
  };
}
