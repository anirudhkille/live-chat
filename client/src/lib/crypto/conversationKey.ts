import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf, bytesToBase64, base64ToBytes } from "./crypto";

/**
 * Compute the per-conversation symmetric key by performing an X25519 key
 * agreement between the current user's private identity key and the peer's
 * public identity key, then deriving a deterministic conversation key bound to
 * the conversation id. Both participants (and, with the restored master seed,
 * any other device of the same user) derive the same key.
 */
export function deriveConversationKey(args: {
  privateKey: string;
  peerPublicKey: string;
  conversationId: string;
}): Uint8Array {
  const shared = x25519.getSharedSecret(
    base64ToBytes(args.privateKey),
    base64ToBytes(args.peerPublicKey)
  );
  return hkdf(shared, `chat:v1:conversation:${args.conversationId}`);
}

export type ConversationKeyBundle = {
  conversationKey: string;
  peerPublicKey: string;
};

export function bundleConversationKey(
  conversationKey: Uint8Array,
  peerPublicKey: string
): ConversationKeyBundle {
  return { conversationKey: bytesToBase64(conversationKey), peerPublicKey };
}
