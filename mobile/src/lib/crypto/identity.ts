import { x25519 } from "@noble/curves/ed25519.js";

import { base64ToBytes, bytesToBase64, hkdf, randomBytes } from "./crypto";

export const MASTER_SEED_BYTES = 32;
export const IDENTITY_HKDF_INFO = "chat:v1:identity";

export type IdentityKeys = {
  masterSeed: string;
  privateKey: string;
  publicKey: string;
};

export function generateMasterSeed(): string {
  return bytesToBase64(randomBytes(MASTER_SEED_BYTES));
}

/**
 * Derives the X25519 identity keys exactly like the web client so messages
 * encrypted on the web can be decrypted on mobile and vice versa.
 */
export function deriveIdentityKeys(masterSeed: string): IdentityKeys {
  const seed = base64ToBytes(masterSeed);
  const privateKeyBytes = hkdf(seed, IDENTITY_HKDF_INFO);
  const privateKey = bytesToBase64(privateKeyBytes);
  const publicKeyBytes = x25519.getPublicKey(privateKeyBytes);

  return {
    masterSeed,
    privateKey,
    publicKey: bytesToBase64(publicKeyBytes),
  };
}

export function createIdentityKeys(): IdentityKeys {
  return deriveIdentityKeys(generateMasterSeed());
}
