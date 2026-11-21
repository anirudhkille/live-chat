"use client";

import { useEffect, useMemo, useState } from "react";
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

const EMPTY_IDS: string[] = [];

export function useDecryptedMessages(
  conversationId: string,
  peerId: string | null,
  messages: Message[],
  options?: DecryptedMessagesOptions
) {
  const isGroup = options?.isGroup ?? false;
  const participantIds = options?.participantIds ?? EMPTY_IDS;
  const { keys } = useE2EIdentity();
  const { data: peerPublicKey } = usePeerPublicKey(peerId);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [decrypted, setDecrypted] = useState<Record<string, string | null>>({});

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

  const { publicKeys: groupPublicKeys } = usePeerPublicKeys(groupSenderIds);

  useEffect(() => {
    if (!keys || !conversationId) return;

    const pending = messages.filter(
      (message) => message.cipherMeta && decrypted[message.id] === undefined
    );

    if (pending.length === 0) return;

    let cancelled = false;

    (async () => {
      const results: Record<string, string | null> = {};

      if (!isGroup) {
        if (!peerPublicKey) return;

        const conversationKey = deriveConversationKey({
          privateKey: keys.privateKey,
          peerPublicKey,
          conversationId,
        });

        for (const message of pending) {
          results[message.id] = await decryptMessage(
            conversationKey,
            message.content,
            message.cipherMeta!
          );
        }
      } else {
        if (!currentUserId) return;

        for (const message of pending) {
          const cipherMeta = message.cipherMeta!;

          if (cipherMeta.mode !== "group") {
            results[message.id] = null;
            continue;
          }

          const senderPublicKey =
            message.senderId === currentUserId
              ? keys.publicKey
              : groupPublicKeys[message.senderId];

          // The sender's key is still loading; leave the message pending so
          // this effect can retry once the key arrives.
          if (!senderPublicKey) continue;

          results[message.id] = await decryptGroupMessage({
            privateKey: keys.privateKey,
            conversationId,
            senderPublicKey,
            recipientId: currentUserId,
            cipherMeta,
          });
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
    conversationId,
    isGroup,
    currentUserId,
    groupPublicKeys,
  ]);

  return useMemo(
    () =>
      messages.flatMap((message) => {
        if (message.deletedAt) return [message];
        if (!message.cipherMeta) return [message];

        const plain = decrypted[message.id];
        if (plain === undefined) return [];
        if (plain === null) {
          return (message.attachments?.length ?? 0) > 0
            ? [{ ...message, content: "" }]
            : [];
        }
        return [{ ...message, content: plain }];
      }),
    [messages, decrypted]
  );
}
