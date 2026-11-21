import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/crypto/storage", () => ({
  dbGet: vi.fn(async () => null),
  dbSet: vi.fn(async () => {}),
  dbDelete: vi.fn(async () => {}),
}));

import { dbGet, dbSet } from "@/lib/crypto/storage";
import {
  deriveIdentityKeys,
  generateMasterSeed,
  type IdentityKeys,
} from "@/lib/crypto/identity";
import { restoreFromBlob } from "@/lib/crypto/recovery";
import {
  clearIdentityMemory,
  createAndUploadIdentity,
  identityMarkerKey,
  identityStorageKey,
  loadIdentityKeys,
} from "./keyManager";

const dbGetMock = vi.mocked(dbGet);
const dbSetMock = vi.mocked(dbSet);

function makeKeys(): IdentityKeys {
  return deriveIdentityKeys(generateMasterSeed());
}

beforeEach(() => {
  vi.clearAllMocks();
  dbGetMock.mockResolvedValue(null);
  clearIdentityMemory();
});

describe("key scoping", () => {
  it("namespaces IndexedDB keys and the localStorage marker per user", () => {
    expect(identityStorageKey("user-a")).toBe("identity-keys:user-a");
    expect(identityStorageKey("user-b")).toBe("identity-keys:user-b");
    expect(identityMarkerKey("user-a")).toBe(
      "live-chat.keys-initialized:user-a"
    );
    expect(identityMarkerKey("user-b")).toBe(
      "live-chat.keys-initialized:user-b"
    );
  });

  it("loads only the requested user's key record", async () => {
    const keys = makeKeys();
    dbGetMock.mockResolvedValueOnce(keys);

    const loaded = await loadIdentityKeys("user-a");

    expect(loaded).toEqual(keys);
    expect(dbGetMock).toHaveBeenCalledWith("identity-keys:user-a");
  });

  it("does not load anything without a user id", async () => {
    expect(await loadIdentityKeys(null)).toBeNull();
    expect(await loadIdentityKeys(undefined)).toBeNull();
    expect(dbGetMock).not.toHaveBeenCalled();
  });

  it("rejects a stored public key that does not match its master seed", async () => {
    const keys = makeKeys();
    const other = makeKeys();
    dbGetMock.mockResolvedValueOnce({ ...keys, publicKey: other.publicKey });

    expect(await loadIdentityKeys("user-a")).toBeNull();
  });

  it("rejects keys that do not match the server public key", async () => {
    const keys = makeKeys();
    const other = makeKeys();
    dbGetMock.mockResolvedValue(keys);

    expect(await loadIdentityKeys("user-a", other.publicKey)).toBeNull();
    expect(await loadIdentityKeys("user-a", keys.publicKey)).toEqual(keys);
  });
});

describe("createAndUploadIdentity", () => {
  it("stores the identity under the authenticated user", async () => {
    const { keys, recoveryBlob } = await createAndUploadIdentity("user-a");

    expect(recoveryBlob).toBeNull();
    expect(keys.masterSeed).toBeTruthy();
    expect(keys.privateKey).toBeTruthy();
    expect(keys.publicKey).toBeTruthy();
    expect(dbSetMock).toHaveBeenCalledWith("identity-keys:user-a", keys);
  });

  it("keeps a restorable blob when a passphrase is given", async () => {
    const { keys, recoveryBlob } = await createAndUploadIdentity(
      "user-a",
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
