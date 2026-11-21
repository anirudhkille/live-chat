import { useEffect, useMemo, useState } from "react";

import { deriveConversationKey } from "@/lib/crypto/conversation-key";
import { decryptGroupMessage, decryptMessage } from "@/lib/crypto/messaging";
import { useAuthStore } from "@/store/auth-store";
import type { Message } from "@/types/api";

import { useE2EIdentity } from "./use-e2e-identity";
import { usePeerPublicKey, usePeerPublicKeys } from "./use-peer-public-key";

export const DECRYPTION_PENDING_TEXT = "Decrypting…";
export const DECRYPTION_FAILED_TEXT = "Unable to decrypt message";

export type MessageDecryptionState = "pending" | "failed";

export type DisplayMessage = Message & {
  decryptionState?: MessageDecryptionState;
};

const EMPTY_IDS: string[] = [];

type DecryptedEntry = {
  plaintext: string | null;
  fingerprint: string;
};

function getCipherFingerprint(message: Message) {
  const cipherMeta = message.cipherMeta;
  if (!cipherMeta) return "";
  return [
    cipherMeta.version,
    cipherMeta.mode ?? "dm",
    cipherMeta.iv,
    message.content,
  ].join(":");
}

/**
 * Decrypts DM and group messages that carry `cipherMeta`, mirroring the web's
 * behavior. Messages without metadata (legacy plaintext, system messages)
 * pass through unchanged. Unreadable messages keep their attachment/UI shell
 * and get a clear placeholder instead of crashing.
 */
export function useDecryptedMessages(args: {
  conversationId: string | undefined;
  peerId: string | null;
  messages: Message[];
  participantIds?: string[];
}) {
  const { conversationId, peerId, messages, participantIds = EMPTY_IDS } = args;
  const { keys, status } = useE2EIdentity();
  const currentUserId = useAuthStore((state) => state.user?.id ?? null);
  const peerKeyQuery = usePeerPublicKey(peerId);
  const peerPublicKey = peerKeyQuery.data ?? null;
  const [decrypted, setDecrypted] = useState<Record<string, DecryptedEntry>>(
    {},
  );

  // Fetch every participant key once per participant list change. Messages
  // from members who have since left are included so old messages stay
  // readable while their key is still available.
  const groupSenderIds = useMemo(() => {
    const ids = new Set<string>();
    participantIds.forEach((id) => {
      if (id) ids.add(id);
    });
    messages.forEach((message) => {
      if (message.cipherMeta?.mode === "group") ids.add(message.senderId);
    });
    if (currentUserId) ids.delete(currentUserId);
    return Array.from(ids).toSorted();
  }, [participantIds, messages, currentUserId]);

  const groupKeysQuery = usePeerPublicKeys(groupSenderIds);
  const groupPublicKeys = groupKeysQuery.publicKeys;

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
    if (!keys || !conversationId) return;

    const pendingMessages = messages.filter((message) => {
      if (!message.cipherMeta) return false;
      const existing = decrypted[message.id];
      return (
        !existing || existing.fingerprint !== getCipherFingerprint(message)
      );
    });
    if (pendingMessages.length === 0) return;

    let cancelled = false;

    void (async () => {
      const results: Record<string, DecryptedEntry> = {};

      for (const message of pendingMessages) {
        const cipherMeta = message.cipherMeta!;
        const fingerprint = getCipherFingerprint(message);

        if (cipherMeta.mode === "group") {
          if (!currentUserId) continue;

          const senderPublicKey =
            message.senderId === currentUserId
              ? keys.publicKey
              : groupPublicKeys[message.senderId];

          // The sender's key is still loading; leave the message pending so
          // this effect can retry once the key arrives.
          if (!senderPublicKey) continue;

          results[message.id] = {
            fingerprint,
            plaintext: await decryptGroupMessage({
              privateKey: keys.privateKey,
              conversationId,
              senderPublicKey,
              recipientId: currentUserId,
              cipherMeta,
            }),
          };
        } else {
          if (!conversationKey) continue;

          results[message.id] = {
            fingerprint,
            plaintext: await decryptMessage(
              conversationKey,
              message.content,
              cipherMeta,
            ),
          };
        }
      }

      if (!cancelled && Object.keys(results).length > 0) {
        setDecrypted((previous) => ({ ...previous, ...results }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    conversationKey,
    decrypted,
    messages,
    keys,
    conversationId,
    currentUserId,
    groupPublicKeys,
  ]);

  const groupKeysPreparing =
    groupSenderIds.length > 0 && groupKeysQuery.isPending;
  const preparing =
    status === "loading" ||
    (peerId ? peerKeyQuery.isPending : false) ||
    groupKeysPreparing;
  const canDecrypt = Boolean(conversationKey);

  return useMemo<DisplayMessage[]>(
    () =>
      messages.map((message) => {
        if (message.deletedAt || !message.cipherMeta) return message;

        const cipherMeta = message.cipherMeta;
        const decryptedEntry = decrypted[message.id];
        const plaintext =
          decryptedEntry &&
          decryptedEntry.fingerprint === getCipherFingerprint(message)
            ? decryptedEntry.plaintext
            : undefined;

        if (plaintext === undefined) {
          const canDecryptMessage =
            cipherMeta.mode === "group"
              ? Boolean(
                  keys &&
                  currentUserId &&
                  (message.senderId === currentUserId
                    ? keys.publicKey
                    : groupPublicKeys[message.senderId]),
                )
              : canDecrypt;

          return {
            ...message,
            content: "",
            decryptionState:
              canDecryptMessage || preparing ? "pending" : "failed",
          };
        }

        if (plaintext === null) {
          return { ...message, content: "", decryptionState: "failed" };
        }

        return { ...message, content: plaintext };
      }),
    [
      canDecrypt,
      currentUserId,
      decrypted,
      groupPublicKeys,
      keys,
      messages,
      preparing,
    ],
  );
}
