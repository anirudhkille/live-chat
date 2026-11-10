import { x25519 } from "@noble/curves/ed25519.js";

import { base64ToBytes, hkdf } from "./crypto";

/**
 * Derives the per-conversation AES key from the current user's private
 * identity key and the peer's public identity key. This is identical to the
 * web implementation.
 */
export function deriveConversationKey(args: {
  privateKey: string;
  peerPublicKey: string;
  conversationId: string;
}): Uint8Array {
  const shared = x25519.getSharedSecret(
    base64ToBytes(args.privateKey),
    base64ToBytes(args.peerPublicKey),
  );

  return hkdf(shared, `chat:v1:conversation:${args.conversationId}`);
}
