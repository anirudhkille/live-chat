import type { CipherMeta } from "@/types/api";

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
