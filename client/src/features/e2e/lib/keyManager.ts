import {
  generateMasterSeed,
  deriveIdentityKeys,
  type IdentityKeys,
} from "@/lib/crypto/identity";
import { createPasskeyRecovery, type PasskeyUser } from "@/lib/crypto/passkey";
import { buildRecoveryBlob } from "@/lib/crypto/recovery";
import { dbDelete, dbGet, dbSet } from "@/lib/crypto/storage";

const IDENTITY_KEY_PREFIX = "identity-keys";
const IDENTITY_MARKER_PREFIX = "live-chat.keys-initialized";

// Keys are scoped per user so a shared browser can never read another
// account's identity after an account switch.
export function identityStorageKey(userId: string): string {
  return `${IDENTITY_KEY_PREFIX}:${userId}`;
}

export function identityMarkerKey(userId: string): string {
  return `${IDENTITY_MARKER_PREFIX}:${userId}`;
}

// A small in-memory cache so repeated loads don't hit IndexedDB. It is scoped
// per user and explicitly cleared on logout/account switch.
const identityCache = new Map<string, IdentityKeys>();

export function clearIdentityMemory(): void {
  identityCache.clear();
}

function markIdentityInitialized(userId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(identityMarkerKey(userId), "1");
  } catch {
    // Best effort only.
  }
}

export function hasLocalIdentityMarker(
  userId: string | null | undefined
): boolean {
  if (!userId || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(identityMarkerKey(userId)) === "1";
  } catch {
    return false;
  }
}

/**
 * Validate a stored key bundle. The public/private pair must be exactly what
 * the master seed derives, and when the server's public key is known the
 * stored public key must match it too. A bundle that fails either check is
 * never used, which prevents a stale or tampered identity from silently
 * decrypting/sending with the wrong key.
 */
export function validateIdentityKeys(
  keys: IdentityKeys | null | undefined,
  expectedPublicKey?: string | null
): IdentityKeys | null {
  if (!keys || typeof keys.masterSeed !== "string" || !keys.masterSeed) {
    return null;
  }

  try {
    const derived = deriveIdentityKeys(keys.masterSeed);
    if (derived.publicKey !== keys.publicKey) return null;
    if (derived.privateKey !== keys.privateKey) return null;
    if (expectedPublicKey && derived.publicKey !== expectedPublicKey) {
      return null;
    }
    return derived;
  } catch {
    return null;
  }
}

export async function loadIdentityKeys(
  userId: string | null | undefined,
  expectedPublicKey?: string | null
): Promise<IdentityKeys | null> {
  if (!userId) return null;

  const cached = identityCache.get(userId);
  const stored =
    cached ?? (await dbGet<IdentityKeys>(identityStorageKey(userId)));
  const keys = validateIdentityKeys(stored, expectedPublicKey);

  if (!keys) {
    if (cached) identityCache.delete(userId);
    return null;
  }

  identityCache.set(userId, keys);
  markIdentityInitialized(userId);
  return keys;
}

export async function saveIdentityKeys(
  userId: string,
  keys: IdentityKeys
): Promise<void> {
  if (!userId) throw new Error("A user id is required to store keys");
  const validated = validateIdentityKeys(keys);
  if (!validated) throw new Error("Refusing to store an invalid key bundle");
  await dbSet(identityStorageKey(userId), validated);
  identityCache.set(userId, validated);
  markIdentityInitialized(userId);
}

export async function deleteIdentityKeys(userId: string): Promise<void> {
  identityCache.delete(userId);
  await dbDelete(identityStorageKey(userId));
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(identityMarkerKey(userId));
    } catch {
      // Best effort only.
    }
  }
}

export async function createAndUploadIdentity(
  userId: string,
  passphrase?: string
) {
  if (!userId) throw new Error("A user id is required to create keys");
  const masterSeed = generateMasterSeed();
  const keys = deriveIdentityKeys(masterSeed);
  const recoveryBlob = passphrase
    ? await buildRecoveryBlob(passphrase, {
        masterSeed: keys.masterSeed,
        privateKey: keys.privateKey,
        publicKey: keys.publicKey,
      })
    : null;
  await saveIdentityKeys(userId, keys);
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
