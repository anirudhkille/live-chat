import { describe, it, expect } from "vitest";
import { buildRecoveryBlob, restoreFromBlob } from "./recovery";
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
});
