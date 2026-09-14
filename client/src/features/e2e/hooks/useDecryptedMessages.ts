"use client";

import { useEffect, useMemo, useState } from "react";
import { deriveConversationKey } from "@/lib/crypto/conversationKey";
import { decryptMessage } from "@/lib/crypto/messaging";
import type { Message } from "@/types/api";
import { useE2EIdentity } from "./useE2EIdentity";
import { usePeerPublicKey } from "./usePeerPublicKey";

export function useDecryptedMessages(
  conversationId: string,
  peerId: string | null,
  messages: Message[]
) {
  const { keys } = useE2EIdentity();
  const { data: peerPublicKey } = usePeerPublicKey(peerId);
  const [decrypted, setDecrypted] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!keys || !peerPublicKey || !conversationId) return;

    const conversationKey = deriveConversationKey({
      privateKey: keys.privateKey,
      peerPublicKey,
      conversationId,
    });

    let cancelled = false;

    const pending = messages.filter(
      (m) => m.cipherMeta && decrypted[m.id] === undefined
    );

    if (pending.length === 0) return;

    (async () => {
      const results: Record<string, string> = {};
      for (const message of pending) {
        const plain = await decryptMessage(
          conversationKey,
          message.content,
          message.cipherMeta!
        );
        results[message.id] = plain ?? "Unable to decrypt message.";
      }
      if (!cancelled) {
        setDecrypted((prev) => ({ ...prev, ...results }));
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, keys, peerPublicKey, conversationId]);

  return useMemo(
    () =>
      messages.map((message) => {
        if (!message.cipherMeta) return message;
        if (!keys || !peerPublicKey) {
          return { ...message, content: "Message" };
        }
        if (decrypted[message.id] === undefined) {
          return { ...message, content: "Message" };
        }
        return { ...message, content: decrypted[message.id] };
      }),
    [messages, keys, peerPublicKey, decrypted]
  );
}
