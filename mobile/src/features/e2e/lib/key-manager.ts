import type { IdentityKeys } from "@/lib/crypto/identity";
import { createIdentityKeys } from "@/lib/crypto/identity";

import { userKeyApi } from "../api/user-key-api";
import { loadIdentityKeys, saveIdentityKeys } from "./identity-store";

export type E2EIdentityStatus = "ready" | "server-key-missing-local";

export type E2EIdentityState = {
  keys: IdentityKeys | null;
  publicKey: string | null;
  status: E2EIdentityStatus;
};

/**
 * Loads the device identity, provisioning one only when the server confirms
 * that this account has no key yet. If the server already has a key but this
 * device doesn't, we never overwrite it; encryption stays disabled and the UI
 * surfaces a recoverable state instead.
 */
export async function initializeE2EIdentity(
  userId?: string | null,
): Promise<E2EIdentityState> {
  const localKeys = await loadIdentityKeys(userId);
  if (localKeys) {
    return {
      keys: localKeys,
      publicKey: localKeys.publicKey,
      status: "ready",
    };
  }

  const ownKey = await userKeyApi.getOwnKey();
  if (ownKey.hasKey) {
    return {
      keys: null,
      publicKey: ownKey.publicKey,
      status: "server-key-missing-local",
    };
  }

  const keys = createIdentityKeys();
  await userKeyApi.saveKey({
    publicKey: keys.publicKey,
    recoveryBlob: null,
  });
  await saveIdentityKeys(keys, userId);

  return {
    keys,
    publicKey: keys.publicKey,
    status: "ready",
  };
}
