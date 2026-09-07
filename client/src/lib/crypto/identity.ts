import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf, randomBytes, bytesToBase64, base64ToBytes } from "./crypto";

export const MASTER_SEED_BYTES = 32;

export type IdentityKeys = {
  masterSeed: string;
  privateKey: string;
  publicKey: string;
};

export function generateMasterSeed(): string {
  return bytesToBase64(randomBytes(MASTER_SEED_BYTES));
}

export function deriveIdentityKeys(masterSeed: string): IdentityKeys {
  const seed = base64ToBytes(masterSeed);
  const privateKeyBytes = hkdf(seed, "chat:v1:identity");
  const privateKey = bytesToBase64(privateKeyBytes);
  const publicKeyBytes = x25519.getPublicKey(privateKeyBytes);
  return {
    masterSeed,
    privateKey,
    publicKey: bytesToBase64(publicKeyBytes),
  };
}

export type ConversationKeys = {
  publicKey: string;
  privateKey: string;
  masterSeed: string;
};

export function makeConversationKeys(): ConversationKeys {
  const masterSeed = generateMasterSeed();
  const keys = deriveIdentityKeys(masterSeed);
  return {
    masterSeed,
    privateKey: keys.privateKey,
    publicKey: keys.publicKey,
  };
}

export type KeyBundle = {
  masterSeed: string;
  privateKey: string;
  publicKey: string;
};

export function toKeyBundle(keys: ConversationKeys): KeyBundle {
  return {
    masterSeed: keys.masterSeed,
    privateKey: keys.privateKey,
    publicKey: keys.publicKey,
  };
}
