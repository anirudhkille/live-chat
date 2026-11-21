import {
  aesEncrypt,
  aesDecrypt,
  randomBytes,
  bytesToBase64,
  base64ToBytes,
} from "./crypto";
import { deriveConversationKey } from "./conversationKey";
import type { CipherMeta, CipherMetaEntry } from "@/types/api";

const VERSION = 1;

export type EncryptedMessage = {
  content: string;
  cipherMeta: CipherMeta;
};

export type GroupCipherEntry = CipherMetaEntry;

export type GroupCipherMeta = CipherMeta & {
  version: typeof VERSION;
  mode: "group";
  entries: Record<string, GroupCipherEntry>;
};

export type GroupEncryptedMessage = {
  content: string;
  cipherMeta: GroupCipherMeta;
};

/**
 * Encrypt plaintext message content with AES-256-GCM using the per-conversation
 * key and a fresh random IV. Returns the base64 ciphertext plus non-secret
 * metadata (version, iv) that can be stored and relayed by the server.
 */
export async function encryptMessage(
  conversationKey: Uint8Array,
  plaintext: string
): Promise<EncryptedMessage> {
  const content = plaintext ?? "";
  const iv = randomBytes(12);
  const ciphertext = await aesEncrypt(conversationKey, content, iv);
  return {
    content: bytesToBase64(ciphertext),
    cipherMeta: {
      version: VERSION,
      iv: bytesToBase64(iv),
    },
  };
}

/**
 * Encrypt the same plaintext independently for every recipient of a group.
 * Each entry uses the pairwise key derived from the sender's private key and
 * that recipient's public key, with a fresh random IV. The sender's own entry
 * is included so the sender can decrypt their own message.
 *
 * Returns null when no entry could be produced, so callers can fall back to
 * their existing plaintext behavior.
 */
export async function encryptGroupMessage(args: {
  privateKey: string;
  conversationId: string;
  currentUserId: string;
  plaintext: string;
  recipientPublicKeys: Record<string, string>;
}): Promise<GroupEncryptedMessage | null> {
  const content = args.plaintext ?? "";
  const entries: Record<string, GroupCipherEntry> = {};

  for (const [userId, publicKey] of Object.entries(args.recipientPublicKeys)) {
    if (!userId || !publicKey) continue;

    try {
      const conversationKey = deriveConversationKey({
        privateKey: args.privateKey,
        peerPublicKey: publicKey,
        conversationId: args.conversationId,
      });
      const encrypted = await encryptMessage(conversationKey, content);
      const iv = encrypted.cipherMeta.iv;
      if (typeof iv !== "string" || !encrypted.content) continue;
      entries[userId] = { iv, content: encrypted.content };
    } catch {
      // A malformed recipient key must not block the rest of the group.
    }
  }

  const recipientIds = Object.keys(entries);
  if (recipientIds.length === 0) return null;

  const ownEntry = entries[args.currentUserId] ?? entries[recipientIds[0]];

  return {
    content: ownEntry.content,
    cipherMeta: {
      version: VERSION,
      mode: "group",
      iv: ownEntry.iv,
      entries,
    },
  };
}

/**
 * Decrypt a group message entry addressed to the current user. The pairwise
 * key is derived from the current user's private key and the sender's public
 * key. Returns null when the entry, key, or ciphertext is unavailable.
 */
export async function decryptGroupMessage(args: {
  privateKey: string;
  conversationId: string;
  senderPublicKey: string;
  recipientId: string;
  cipherMeta: CipherMeta | null | undefined;
}): Promise<string | null> {
  const cipherMeta = args.cipherMeta;
  if (
    !cipherMeta ||
    cipherMeta.version !== VERSION ||
    cipherMeta.mode !== "group"
  ) {
    return null;
  }

  const entry = cipherMeta.entries?.[args.recipientId];
  if (
    !entry ||
    typeof entry.iv !== "string" ||
    typeof entry.content !== "string"
  ) {
    return null;
  }

  try {
    const conversationKey = deriveConversationKey({
      privateKey: args.privateKey,
      peerPublicKey: args.senderPublicKey,
      conversationId: args.conversationId,
    });
    return await aesDecrypt(
      conversationKey,
      base64ToBytes(entry.content),
      base64ToBytes(entry.iv)
    );
  } catch {
    return null;
  }
}

/**
 * Decrypt message content. Returns plaintext, or null when the message can't
 * be decrypted (missing/legacy metadata, wrong key, or deleted content).
 */
export async function decryptMessage(
  conversationKey: Uint8Array | null,
  content: string | null,
  cipherMeta: CipherMeta | null
): Promise<string | null> {
  if (!conversationKey || !content) return null;
  if (!cipherMeta || cipherMeta.version !== VERSION) return null;
  const iv = cipherMeta.iv;
  if (typeof iv !== "string") return null;
  try {
    const ciphertext = base64ToBytes(content);
    return await aesDecrypt(conversationKey, ciphertext, base64ToBytes(iv));
  } catch {
    return null;
  }
}
