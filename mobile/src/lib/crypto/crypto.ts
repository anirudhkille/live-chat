import { gcm } from "@noble/ciphers/aes.js";
import { bytesToUtf8, utf8ToBytes } from "@noble/ciphers/utils.js";
import { extract, expand } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { getRandomBytes } from "expo-crypto";

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const BASE64_LOOKUP = (() => {
  const lookup = new Int16Array(128).fill(-1);
  for (let index = 0; index < BASE64_ALPHABET.length; index += 1) {
    lookup[BASE64_ALPHABET.charCodeAt(index)] = index;
  }
  return lookup;
})();

/**
 * Browser-independent base64 encoder. Hermes doesn't expose `btoa` on every
 * platform, so we use a small pure-JS implementation.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let output = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;

    output += BASE64_ALPHABET[first >> 2];
    output += BASE64_ALPHABET[((first & 0x03) << 4) | (second >> 4)];
    output +=
      index + 1 < bytes.length
        ? BASE64_ALPHABET[((second & 0x0f) << 2) | (third >> 6)]
        : "=";
    output += index + 2 < bytes.length ? BASE64_ALPHABET[third & 0x3f] : "=";
  }

  return output;
}

/** Browser-independent base64 decoder. */
export function base64ToBytes(base64: string): Uint8Array {
  const input = base64.trim().replace(/[\r\n\s]/g, "");
  if (input.length % 4 === 1) {
    throw new Error("Invalid base64 input");
  }

  const padding = input.endsWith("==") ? 2 : input.endsWith("=") ? 1 : 0;
  const output = new Uint8Array(Math.floor((input.length * 3) / 4) - padding);

  let buffer = 0;
  let bits = 0;
  let outputIndex = 0;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === "=") break;

    const code = char.charCodeAt(0);
    const value = code < 128 ? BASE64_LOOKUP[code] : -1;
    if (value < 0) throw new Error("Invalid base64 input");

    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output[outputIndex] = (buffer >> bits) & 0xff;
      outputIndex += 1;
    }
  }

  return output.slice(0, outputIndex);
}

export function randomBytes(length: number): Uint8Array {
  return getRandomBytes(length);
}

/** HKDF-SHA256 with an empty salt, matching the web client. */
export function hkdf(ikm: Uint8Array, info: string, length = 32): Uint8Array {
  const prk = extract(sha256, ikm);
  return expand(sha256, prk, utf8ToBytes(info), length);
}

/**
 * AES-256-GCM with a 12-byte IV. The output is ciphertext followed by the
 * 16-byte authentication tag, which is the same layout WebCrypto uses.
 */
export function aesEncrypt(
  key: Uint8Array,
  plaintext: string,
  iv: Uint8Array,
): Uint8Array {
  return gcm(key, iv).encrypt(utf8ToBytes(plaintext));
}

export function aesDecrypt(
  key: Uint8Array,
  ciphertext: Uint8Array,
  iv: Uint8Array,
): string {
  return bytesToUtf8(gcm(key, iv).decrypt(ciphertext));
}
