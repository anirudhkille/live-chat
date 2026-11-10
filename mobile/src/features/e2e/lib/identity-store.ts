import * as SecureStore from "expo-secure-store";

import { base64ToBytes } from "@/lib/crypto/crypto";
import type { IdentityKeys } from "@/lib/crypto/identity";

export const IDENTITY_STORAGE_KEY = "live-chat.e2e.identity";

export function getIdentityStorageKey(userId?: string | null) {
  return userId ? `${IDENTITY_STORAGE_KEY}.${userId}` : IDENTITY_STORAGE_KEY;
}

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;
const KEY_BYTES = 32;

function isKeyString(value: unknown): value is string {
  if (typeof value !== "string" || !BASE64_PATTERN.test(value)) return false;

  try {
    return base64ToBytes(value).length === KEY_BYTES;
  } catch {
    return false;
  }
}

function isIdentityKeys(value: unknown): value is IdentityKeys {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;

  return (
    isKeyString(record.masterSeed) &&
    isKeyString(record.privateKey) &&
    isKeyString(record.publicKey)
  );
}

export async function loadIdentityKeys(
  userId?: string | null,
): Promise<IdentityKeys | null> {
  try {
    const raw = await SecureStore.getItemAsync(getIdentityStorageKey(userId));
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    return isIdentityKeys(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveIdentityKeys(
  keys: IdentityKeys,
  userId?: string | null,
): Promise<void> {
  await SecureStore.setItemAsync(
    getIdentityStorageKey(userId),
    JSON.stringify(keys),
  );
}

export async function clearIdentityKeys(userId?: string | null): Promise<void> {
  await SecureStore.deleteItemAsync(getIdentityStorageKey(userId));
}
