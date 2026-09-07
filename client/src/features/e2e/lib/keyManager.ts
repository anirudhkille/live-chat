import {
  generateMasterSeed,
  deriveIdentityKeys,
  type IdentityKeys,
} from "@/lib/crypto/identity";
import { buildRecoveryBlob } from "@/lib/crypto/recovery";
import { dbGet, dbSet } from "@/lib/crypto/storage";

const KEY_STORAGE_KEY = "identity-keys";

export async function loadIdentityKeys(): Promise<IdentityKeys | null> {
  return dbGet<IdentityKeys>(KEY_STORAGE_KEY);
}

export async function saveIdentityKeys(keys: IdentityKeys): Promise<void> {
  await dbSet(KEY_STORAGE_KEY, keys);
}

export async function createAndUploadIdentity(passphrase: string) {
  const masterSeed = generateMasterSeed();
  const keys = deriveIdentityKeys(masterSeed);
  const recoveryBlob = await buildRecoveryBlob(passphrase, {
    masterSeed: keys.masterSeed,
    privateKey: keys.privateKey,
    publicKey: keys.publicKey,
  });
  await saveIdentityKeys(keys);
  return { keys, recoveryBlob };
}
