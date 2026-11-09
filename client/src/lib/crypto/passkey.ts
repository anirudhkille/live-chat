import {
  aesDecrypt,
  aesEncrypt,
  base64ToBytes,
  bytesToBase64,
  hkdf,
  randomBytes,
} from "./crypto";
import type {
  PasskeyRecoveryBlob,
  RecoveryPayload,
  RecoveryResult,
} from "./recovery";
import { isPasskeyRecoveryBlob } from "./recovery";

const PRF_SALT_BYTES = 32;
const WRAPPING_KEY_INFO = "live-chat:e2e:passkey-recovery:v1";

type PrfExtensionInputs = {
  prf?: {
    eval?: {
      first?: BufferSource;
    };
  };
};

type PrfExtensionOutputs = {
  prf?: {
    enabled?: boolean;
    results?: {
      first?: ArrayBuffer;
    };
  };
};

export type PasskeyUser = {
  id: string;
  email: string;
  name?: string | null;
};

function toBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);

  return base64ToBytes(base64 + padding);
}

function toBufferSource(bytes: Uint8Array): BufferSource {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

function buildPrfInputs(
  salt: Uint8Array
): AuthenticationExtensionsClientInputs {
  return {
    prf: {
      eval: {
        first: toBufferSource(salt),
      },
    },
  } as AuthenticationExtensionsClientInputs & PrfExtensionInputs;
}

function getPrfOutput(credential: PublicKeyCredential): Uint8Array | null {
  const extensions =
    credential.getClientExtensionResults() as PrfExtensionOutputs;
  const first = extensions.prf?.results?.first;

  if (!first) {
    return null;
  }

  return new Uint8Array(first);
}

async function getPasskeyPrfOutput(
  credentialId: string,
  salt: Uint8Array
): Promise<Uint8Array> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: toBufferSource(randomBytes(32)),
      rpId: window.location.hostname,
      allowCredentials: [
        {
          id: toBufferSource(fromBase64Url(credentialId)),
          type: "public-key",
          transports: ["internal"],
        },
      ],
      userVerification: "required",
      extensions: buildPrfInputs(salt),
    },
  })) as PublicKeyCredential | null;

  if (!assertion) {
    throw new Error("Passkey verification was cancelled.");
  }

  const prfOutput = getPrfOutput(assertion);

  if (!prfOutput) {
    throw new Error(
      "This passkey does not support encryption on this device. Try another browser or use a recovery passphrase."
    );
  }

  return prfOutput;
}

function wrapPayload(
  wrappingKey: Uint8Array,
  payload: RecoveryPayload
): Promise<{ data: string }> {
  const iv = randomBytes(12);

  return aesEncrypt(wrappingKey, JSON.stringify(payload), iv).then(
    (ciphertext) => {
      const data = new Uint8Array(iv.length + ciphertext.length);
      data.set(iv);
      data.set(ciphertext, iv.length);

      return { data: bytesToBase64(data) };
    }
  );
}

export function isPasskeyRecoverySupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "PublicKeyCredential" in window &&
    typeof navigator.credentials?.create === "function" &&
    typeof navigator.credentials?.get === "function"
  );
}

export async function createPasskeyRecovery(
  user: PasskeyUser,
  payload: RecoveryPayload
): Promise<PasskeyRecoveryBlob> {
  if (!isPasskeyRecoverySupported()) {
    throw new Error("Passkeys are not supported in this browser.");
  }

  const salt = randomBytes(PRF_SALT_BYTES);
  const challenge = randomBytes(32);
  const userId = new TextEncoder().encode(user.id);
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: toBufferSource(challenge),
      rp: {
        name: "Live Chat",
        id: window.location.hostname,
      },
      user: {
        id: toBufferSource(userId),
        name: user.email,
        displayName: user.name || user.email,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },
        { alg: -257, type: "public-key" },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "required",
        userVerification: "required",
      },
      attestation: "none",
      extensions: buildPrfInputs(salt),
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error("Passkey setup was cancelled.");
  }

  const credentialId = toBase64Url(new Uint8Array(credential.rawId));
  const prfOutput =
    getPrfOutput(credential) ?? (await getPasskeyPrfOutput(credentialId, salt));
  const wrappingKey = hkdf(prfOutput, WRAPPING_KEY_INFO, 32);
  const { data } = await wrapPayload(wrappingKey, payload);

  return {
    version: 1,
    method: "passkey-prf",
    credentialId,
    salt: bytesToBase64(salt),
    data,
    publicKey: payload.publicKey,
  };
}

export async function restoreFromPasskeyBlob(
  blob: PasskeyRecoveryBlob
): Promise<RecoveryResult> {
  if (!isPasskeyRecoverySupported()) {
    return {
      ok: false,
      error: "Passkeys are not supported in this browser.",
    };
  }

  try {
    const prfOutput = await getPasskeyPrfOutput(
      blob.credentialId,
      base64ToBytes(blob.salt)
    );
    const wrappingKey = hkdf(prfOutput, WRAPPING_KEY_INFO, 32);
    const packed = base64ToBytes(blob.data);

    if (packed.length <= 12) {
      return { ok: false, error: "Invalid recovery data." };
    }

    const decrypted = await aesDecrypt(
      wrappingKey,
      packed.slice(12),
      packed.slice(0, 12)
    );
    const payload = JSON.parse(decrypted) as Partial<RecoveryPayload>;

    if (
      typeof payload.masterSeed !== "string" ||
      typeof payload.privateKey !== "string" ||
      typeof payload.publicKey !== "string"
    ) {
      return { ok: false, error: "Invalid recovery data." };
    }

    return { ok: true, keys: payload as RecoveryPayload };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not restore keys.",
    };
  }
}

export function isPasskeyBlob(value: unknown): value is PasskeyRecoveryBlob {
  return isPasskeyRecoveryBlob(value);
}
