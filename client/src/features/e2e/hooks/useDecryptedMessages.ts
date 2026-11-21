"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { deriveConversationKey } from "@/lib/crypto/conversationKey";
import { decryptGroupMessage, decryptMessage } from "@/lib/crypto/messaging";
import { useAuthStore } from "@/store/auth-store";
import type { Message } from "@/types/api";
import { useE2EIdentity } from "./useE2EIdentity";
import { usePeerPublicKey, usePeerPublicKeys } from "./usePeerPublicKey";

type DecryptedMessagesOptions = {
  isGroup?: boolean;
  participantIds?: string[];
};

export type MessageDecryptionError = "keys-unavailable" | "failed";

export type DisplayMessage = Message & {
  decryptionError?: MessageDecryptionError;
};

type DecryptedEntry = {
  text: string | null;
  error?: MessageDecryptionError;
  signature: string;
};

const EMPTY_IDS: string[] = [];

// A message's plaintext is only valid for the exact ciphertext/metadata that
// produced it. Including updatedAt means an edit automatically invalidates the
// cached plaintext instead of showing stale text.
function signatureOf(message: Message): string {
  const mode = message.cipherMeta?.mode ?? "";
  const iv = message.cipherMeta?.iv ?? "";
  return `${message.updatedAt}|${message.content}|${mode}|${iv}`;
}

function errorForMessage(
  message: Message,
  error: MessageDecryptionError
): DisplayMessage {
  return { ...message, content: "", decryptionError: error };
}

export function useDecryptedMessages(
  conversationId: string,
  peerId: string | null,
  messages: Message[],
  options?: DecryptedMessagesOptions
) {
  const isGroup = options?.isGroup ?? false;
  const participantIds = options?.participantIds ?? EMPTY_IDS;
  const { keys } = useE2EIdentity();
  const { data: peerPublicKey, isPending: peerKeyPending } =
    usePeerPublicKey(peerId);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [decrypted, setDecrypted] = useState<Record<string, DecryptedEntry>>(
    {}
  );
  const scopeRef = useRef<string>("");

  // Decrypted plaintext must never leak across conversations or accounts.
  const scope = `${conversationId}:${currentUserId ?? ""}`;
  useEffect(() => {
    if (scopeRef.current === scope) return;
    scopeRef.current = scope;
    setDecrypted({});
  }, [scope]);

  // Fetch every participant key once per participant list change. Messages
  // from members who have since left are included so old messages stay
  // readable while their key is still available.
  const groupSenderIds = useMemo(() => {
    if (!isGroup) return EMPTY_IDS;

    const ids = new Set<string>();
    participantIds.forEach((id) => {
      if (id) ids.add(id);
    });
    messages.forEach((message) => {
      if (message.cipherMeta?.mode === "group") ids.add(message.senderId);
    });
    if (currentUserId) ids.delete(currentUserId);
    return Array.from(ids).sort();
  }, [isGroup, participantIds, messages, currentUserId]);

  const { publicKeys: groupPublicKeys, isPending: groupKeysPending } =
    usePeerPublicKeys(groupSenderIds);

  useEffect(() => {
    if (!keys || !conversationId) return;

    const pending = messages.filter((message) => {
      if (!message.cipherMeta) return false;
      const entry = decrypted[message.id];
      return !entry || entry.signature !== signatureOf(message);
    });

    if (pending.length === 0) return;

    let cancelled = false;

    (async () => {
      const results: Record<string, DecryptedEntry> = {};

      if (!isGroup) {
        if (!peerPublicKey) {
          // Only report a missing key once the lookup has actually finished.
          if (!peerKeyPending) {
            for (const message of pending) {
              results[message.id] = {
                text: null,
                error: "keys-unavailable",
                signature: signatureOf(message),
              };
            }
          }
        } else {
          let conversationKey: Uint8Array | null = null;
          try {
            conversationKey = deriveConversationKey({
              privateKey: keys.privateKey,
              peerPublicKey,
              conversationId,
            });
          } catch {
            for (const message of pending) {
              results[message.id] = {
                text: null,
                error: "failed",
                signature: signatureOf(message),
              };
            }
          }

          if (conversationKey) {
            for (const message of pending) {
              let text: string | null = null;
              try {
                text = await decryptMessage(
                  conversationKey,
                  message.content,
                  message.cipherMeta!
                );
              } catch {
                text = null;
              }
              results[message.id] = {
                text,
                error: text === null ? "failed" : undefined,
                signature: signatureOf(message),
              };
            }
          }
        }
      } else {
        if (!currentUserId) return;

        for (const message of pending) {
          const cipherMeta = message.cipherMeta!;

          if (cipherMeta.mode !== "group") {
            results[message.id] = {
              text: null,
              error: "failed",
              signature: signatureOf(message),
            };
            continue;
          }

          const senderPublicKey =
            message.senderId === currentUserId
              ? keys.publicKey
              : groupPublicKeys[message.senderId];

          // The sender's key is still loading; leave the message pending so
          // this effect can retry once the key arrives.
          if (!senderPublicKey) {
            if (!groupKeysPending) {
              results[message.id] = {
                text: null,
                error: "keys-unavailable",
                signature: signatureOf(message),
              };
            }
            continue;
          }

          let text: string | null = null;
          try {
            text = await decryptGroupMessage({
              privateKey: keys.privateKey,
              conversationId,
              senderPublicKey,
              recipientId: currentUserId,
              cipherMeta,
            });
          } catch {
            text = null;
          }

          results[message.id] = {
            text,
            error: text === null ? "failed" : undefined,
            signature: signatureOf(message),
          };
        }
      }

      if (!cancelled && Object.keys(results).length > 0) {
        setDecrypted((prev) => ({ ...prev, ...results }));
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    messages,
    keys,
    peerPublicKey,
    peerKeyPending,
    conversationId,
    isGroup,
    currentUserId,
    groupPublicKeys,
    groupKeysPending,
    decrypted,
  ]);

  return useMemo(() => {
    return messages.flatMap((message): DisplayMessage[] => {
      if (message.deletedAt) return [message];
      if (!message.cipherMeta) return [message];

      const entry = decrypted[message.id];
      if (!entry) {
        // Identity is known to be unavailable, so don't wait forever.
        if (!keys) return [errorForMessage(message, "keys-unavailable")];
        return [];
      }

      if (entry.error) {
        return [errorForMessage(message, entry.error)];
      }

      if (entry.text === null) {
        return [errorForMessage(message, "failed")];
      }

      return [{ ...message, content: entry.text }];
    });
  }, [messages, decrypted, keys]);
}
