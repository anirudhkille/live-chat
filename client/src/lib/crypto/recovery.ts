import {
  pbkdf2,
  aesEncrypt,
  aesDecrypt,
  randomBytes,
  bytesToBase64,
  base64ToBytes,
} from "./crypto";

const PBKDF2_ITERATIONS = 310_000;
const SALT_BYTES = 16;

export type RecoveryPayload = {
  masterSeed: string;
  privateKey: string;
  publicKey: string;
};

export type RecoveryBlob = {
  version: number;
  iterations: number;
  salt: string;
  data: string;
  publicKey: string;
};

export type RecoveryResult =
  { ok: true; keys: RecoveryPayload } | { ok: false; error: string };

/**
 * Encrypt the key bundle with a passphrase-derived key. The resulting blob can
 * be stored on the server: it is safe to expose, since it is only readable with
 * the passphrase (which never leaves the client).
 */
export async function buildRecoveryBlob(
  passphrase: string,
  payload: RecoveryPayload
): Promise<RecoveryBlob> {
  const salt = randomBytes(SALT_BYTES);
  const kek = await pbkdf2(passphrase, salt, PBKDF2_ITERATIONS);
  const iv = randomBytes(12);
  const ciphertext = await aesEncrypt(kek, JSON.stringify(payload), iv);
  return {
    version: 1,
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    data: bytesToBase64(new Uint8Array([...iv, ...ciphertext])),
    publicKey: payload.publicKey,
  };
}

export async function restoreFromBlob(
  passphrase: string,
  blob: RecoveryBlob
): Promise<RecoveryResult> {
  try {
    const salt = base64ToBytes(blob.salt);
    const kek = await pbkdf2(
      passphrase,
      salt,
      blob.iterations || PBKDF2_ITERATIONS
    );
    const raw = base64ToBytes(blob.data);
    const iv = raw.subarray(0, 12);
    const ciphertext = raw.subarray(12);
    const json = await aesDecrypt(kek, ciphertext, iv);
    const payload = JSON.parse(json) as RecoveryPayload;
    if (!payload.masterSeed || !payload.privateKey || !payload.publicKey) {
      return { ok: false, error: "Recovery data is malformed" };
    }
    return { ok: true, keys: payload };
  } catch {
    return { ok: false, error: "Incorrect passphrase" };
  }
}
