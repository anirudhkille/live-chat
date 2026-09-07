import { describe, it, expect } from "vitest";
import { encryptMessage, decryptMessage } from "./messaging";
import { randomBytes } from "./crypto";

describe("messaging", () => {
  it("round-trips plaintext", async () => {
    const key = randomBytes(32);
    const plaintext = "hello secret world";
    const encrypted = await encryptMessage(key, plaintext);
    const decrypted = await decryptMessage(
      key,
      encrypted.content,
      encrypted.cipherMeta
    );
    expect(decrypted).toBe(plaintext);
  });

  it("returns null for wrong key", async () => {
    const key = randomBytes(32);
    const wrongKey = randomBytes(32);
    const encrypted = await encryptMessage(key, "secret");
    const decrypted = await decryptMessage(
      wrongKey,
      encrypted.content,
      encrypted.cipherMeta
    );
    expect(decrypted).toBeNull();
  });

  it("returns null when cipherMeta is missing", async () => {
    const decrypted = await decryptMessage(randomBytes(32), "abc", null);
    expect(decrypted).toBeNull();
  });
});
