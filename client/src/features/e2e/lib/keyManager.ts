import {
  generateMasterSeed,
  deriveIdentityKeys,
  type IdentityKeys,
} from "@/lib/crypto/identity";
import { createPasskeyRecovery, type PasskeyUser } from "@/lib/crypto/passkey";
import { buildRecoveryBlob } from "@/lib/crypto/recovery";
import { dbGet, dbSet } from "@/lib/crypto/storage";

const KEY_STORAGE_KEY = "identity-keys";
const IDENTITY_MARKER_KEY = "live-chat.keys-initialized";

function markIdentityInitialized() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(IDENTITY_MARKER_KEY, "1");
  } catch {
    // Best effort only.
  }
}

export function hasLocalIdentityMarker(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(IDENTITY_MARKER_KEY) === "1";
  } catch {
    return false;
  }
}

export async function loadIdentityKeys(): Promise<IdentityKeys | null> {
  const keys = await dbGet<IdentityKeys>(KEY_STORAGE_KEY);
  if (keys) {
    markIdentityInitialized();
  }
  return keys;
}

export async function saveIdentityKeys(keys: IdentityKeys): Promise<void> {
  await dbSet(KEY_STORAGE_KEY, keys);
  markIdentityInitialized();
}

export async function createAndUploadIdentity(passphrase?: string) {
  const masterSeed = generateMasterSeed();
  const keys = deriveIdentityKeys(masterSeed);
  const recoveryBlob = passphrase
    ? await buildRecoveryBlob(passphrase, {
        masterSeed: keys.masterSeed,
        privateKey: keys.privateKey,
        publicKey: keys.publicKey,
      })
    : null;
  await saveIdentityKeys(keys);
  return { keys, recoveryBlob };
}

export async function buildRecoveryBlobForKeys(
  passphrase: string,
  keys: IdentityKeys
) {
  return buildRecoveryBlob(passphrase, {
    masterSeed: keys.masterSeed,
    privateKey: keys.privateKey,
    publicKey: keys.publicKey,
  });
}

export async function buildPasskeyRecoveryBlobForKeys(
  user: PasskeyUser,
  keys: IdentityKeys
) {
  return createPasskeyRecovery(user, {
    masterSeed: keys.masterSeed,
    privateKey: keys.privateKey,
    publicKey: keys.publicKey,
  });
}
