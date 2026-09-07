import {
  aesEncrypt,
  aesDecrypt,
  randomBytes,
  bytesToBase64,
  base64ToBytes,
} from "./crypto";
import type { CipherMeta } from "@/types/api";

const VERSION = 1;

export type EncryptedMessage = {
  content: string;
  cipherMeta: CipherMeta;
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
