import type { CipherMeta, CipherMetaEntry } from "@/types/api";

import { deriveConversationKey } from "./conversation-key";
import {
  aesDecrypt,
  aesEncrypt,
  base64ToBytes,
  bytesToBase64,
  randomBytes,
} from "./crypto";

const VERSION = 1;
const IV_BYTES = 12;

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
 * Encrypt plaintext with AES-256-GCM using the conversation key and a fresh
 * random IV. The ciphertext and non-secret metadata match the web payload.
 */
export async function encryptMessage(
  conversationKey: Uint8Array,
  plaintext: string,
): Promise<EncryptedMessage> {
  const content = plaintext ?? "";
  const iv = randomBytes(IV_BYTES);
  const ciphertext = aesEncrypt(conversationKey, content, iv);

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
  /**
   * Every participant that must be able to read the message. When provided,
   * the function returns null unless an entry exists for each id; callers use
   * this to avoid sending a partial envelope.
   */
  requiredRecipientIds?: string[];
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

  const requiredIds = args.requiredRecipientIds
    ? Array.from(new Set(args.requiredRecipientIds))
    : Object.keys(args.recipientPublicKeys);
  if (requiredIds.some((userId) => !entries[userId])) return null;

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
    return aesDecrypt(
      conversationKey,
      base64ToBytes(entry.content),
      base64ToBytes(entry.iv),
    );
  } catch {
    return null;
  }
}

/**
 * Decrypts a message. Returns `null` for legacy/malformed metadata, a wrong
 * key, or tampered ciphertext instead of throwing.
 */
export async function decryptMessage(
  conversationKey: Uint8Array | null,
  content: string | null,
  cipherMeta: CipherMeta | null | undefined,
): Promise<string | null> {
  if (!conversationKey || !content) return null;
  if (!cipherMeta || cipherMeta.version !== VERSION) return null;

  const iv = cipherMeta.iv;
  if (typeof iv !== "string") return null;

  try {
    return aesDecrypt(
      conversationKey,
      base64ToBytes(content),
      base64ToBytes(iv),
    );
  } catch {
    return null;
  }
}
