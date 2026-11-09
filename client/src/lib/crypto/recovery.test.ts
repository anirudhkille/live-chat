import { describe, it, expect } from "vitest";
import {
  buildRecoveryBlob,
  isPasskeyRecoveryBlob,
  isPassphraseRecoveryBlob,
  restoreFromBlob,
} from "./recovery";
import { makeConversationKeys } from "./identity";

describe("recovery", () => {
  it("round-trips through passphrase", async () => {
    const keys = makeConversationKeys();
    const blob = await buildRecoveryBlob("correct horse battery staple", {
      masterSeed: keys.masterSeed,
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
    });

    const result = await restoreFromBlob("correct horse battery staple", blob);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.keys.masterSeed).toBe(keys.masterSeed);
      expect(result.keys.privateKey).toBe(keys.privateKey);
      expect(result.keys.publicKey).toBe(keys.publicKey);
    }
  });

  it("fails with wrong passphrase", async () => {
    const keys = makeConversationKeys();
    const blob = await buildRecoveryBlob("right passphrase", {
      masterSeed: keys.masterSeed,
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
    });

    const result = await restoreFromBlob("wrong passphrase", blob);
    expect(result.ok).toBe(false);
  });

  it("identifies passphrase and passkey blobs", async () => {
    const keys = makeConversationKeys();
    const passphraseBlob = await buildRecoveryBlob("passphrase", {
      masterSeed: keys.masterSeed,
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
    });
    const passkeyBlob = {
      version: 1,
      method: "passkey-prf" as const,
      credentialId: "credential",
      salt: "salt",
      data: "data",
      publicKey: keys.publicKey,
    };

    expect(isPassphraseRecoveryBlob(passphraseBlob)).toBe(true);
    expect(isPasskeyRecoveryBlob(passphraseBlob)).toBe(false);
    expect(isPasskeyRecoveryBlob(passkeyBlob)).toBe(true);
    expect(isPassphraseRecoveryBlob(passkeyBlob)).toBe(false);
  });

  it("refuses to restore a passkey blob with a passphrase", async () => {
    const result = await restoreFromBlob("passphrase", {
      version: 1,
      method: "passkey-prf",
      credentialId: "credential",
      salt: "salt",
      data: "data",
      publicKey: "public-key",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/passkey recovery/i);
    }
  });
});
