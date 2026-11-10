import { useEffect, useMemo, useState } from "react";

import { deriveConversationKey } from "@/lib/crypto/conversation-key";
import { decryptMessage } from "@/lib/crypto/messaging";
import type { Message } from "@/types/api";

import { useE2EIdentity } from "./use-e2e-identity";
import { usePeerPublicKey } from "./use-peer-public-key";

export const DECRYPTION_PENDING_TEXT = "Decrypting…";
export const DECRYPTION_FAILED_TEXT = "Unable to decrypt message";

export type MessageDecryptionState = "pending" | "failed";

export type DisplayMessage = Message & {
  decryptionState?: MessageDecryptionState;
};

/**
 * Decrypts DM messages that carry `cipherMeta`, mirroring the web's behavior.
 * Messages without metadata (groups, legacy plaintext, system messages) pass
 * through unchanged. Unreadable messages keep their attachment/UI shell and
 * get a clear placeholder instead of crashing.
 */
export function useDecryptedMessages(args: {
  conversationId: string | undefined;
  peerId: string | null;
  messages: Message[];
}) {
  const { conversationId, peerId, messages } = args;
  const { keys, status } = useE2EIdentity();
  const peerKeyQuery = usePeerPublicKey(peerId);
  const peerPublicKey = peerKeyQuery.data ?? null;
  const [decrypted, setDecrypted] = useState<Record<string, string | null>>({});

  const conversationKey = useMemo(() => {
    if (!keys || !peerPublicKey || !conversationId) return null;

    try {
      return deriveConversationKey({
        privateKey: keys.privateKey,
        peerPublicKey,
        conversationId,
      });
    } catch {
      return null;
    }
  }, [conversationId, keys, peerPublicKey]);

  useEffect(() => {
    if (!conversationKey) return;

    const pendingMessages = messages.filter(
      (message) => message.cipherMeta && decrypted[message.id] === undefined,
    );
    if (pendingMessages.length === 0) return;

    let cancelled = false;

    void (async () => {
      const results: Record<string, string | null> = {};

      for (const message of pendingMessages) {
        results[message.id] = await decryptMessage(
          conversationKey,
          message.content,
          message.cipherMeta,
        );
      }

      if (!cancelled) {
        setDecrypted((previous) => ({ ...previous, ...results }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationKey, decrypted, messages]);

  const preparing =
    status === "loading" || (peerId ? peerKeyQuery.isPending : false);
  const canDecrypt = Boolean(conversationKey);

  return useMemo<DisplayMessage[]>(
    () =>
      messages.map((message) => {
        if (message.deletedAt || !message.cipherMeta) return message;

        const plaintext = decrypted[message.id];

        if (plaintext === undefined) {
          return {
            ...message,
            content: "",
            decryptionState: canDecrypt || preparing ? "pending" : "failed",
          };
        }

        if (plaintext === null) {
          return { ...message, content: "", decryptionState: "failed" };
        }

        return { ...message, content: plaintext };
      }),
    [canDecrypt, decrypted, messages, preparing],
  );
}
