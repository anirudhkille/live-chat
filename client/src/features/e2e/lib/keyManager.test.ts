import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/crypto/storage", () => ({
  dbGet: vi.fn(async () => null),
  dbSet: vi.fn(async () => {}),
  dbDelete: vi.fn(async () => {}),
}));

import { restoreFromBlob } from "@/lib/crypto/recovery";
import { createAndUploadIdentity } from "./keyManager";

describe("createAndUploadIdentity", () => {
  it("creates an identity with no recovery blob when no passphrase is given", async () => {
    const { keys, recoveryBlob } = await createAndUploadIdentity();

    expect(recoveryBlob).toBeNull();
    expect(keys.masterSeed).toBeTruthy();
    expect(keys.privateKey).toBeTruthy();
    expect(keys.publicKey).toBeTruthy();
  });

  it("keeps a restorable blob when a passphrase is given", async () => {
    const { keys, recoveryBlob } = await createAndUploadIdentity(
      "correct horse battery staple"
    );

    expect(recoveryBlob).not.toBeNull();

    const restored = await restoreFromBlob(
      "correct horse battery staple",
      recoveryBlob!
    );

    expect(restored.ok).toBe(true);
    if (restored.ok) {
      expect(restored.keys.privateKey).toBe(keys.privateKey);
    }
  });
});
