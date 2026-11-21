import { describe, expect, it } from "vitest";
import {
  getEncryptionBlocker,
  getEncryptionReadiness,
} from "./message-encryption";

describe("getEncryptionReadiness", () => {
  it("requires keys and the peer key for a DM", () => {
    expect(
      getEncryptionReadiness({
        isGroup: false,
        hasKeys: false,
        currentUserId: "me",
        peerPublicKey: "peer-key",
        groupPublicKeys: {},
      }).ready
    ).toBe(false);

    expect(
      getEncryptionReadiness({
        isGroup: false,
        hasKeys: true,
        currentUserId: "me",
        peerPublicKey: null,
        groupPublicKeys: {},
      }).ready
    ).toBe(false);

    expect(
      getEncryptionReadiness({
        isGroup: false,
        hasKeys: true,
        currentUserId: "me",
        peerPublicKey: "peer-key",
        groupPublicKeys: {},
      }).ready
    ).toBe(true);
  });

  it("requires every current group participant key", () => {
    const readiness = getEncryptionReadiness({
      isGroup: true,
      hasKeys: true,
      currentUserId: "me",
      peerPublicKey: null,
      participantIds: ["me", "alice", "bob"],
      groupPublicKeys: { alice: "alice-key" },
    });

    expect(readiness.requiredIds).toEqual(["alice", "bob", "me"]);
    expect(readiness.missingIds).toEqual(["bob"]);
    expect(readiness.ready).toBe(false);
  });

  it("is ready when all group participants have keys", () => {
    const readiness = getEncryptionReadiness({
      isGroup: true,
      hasKeys: true,
      currentUserId: "me",
      peerPublicKey: null,
      participantIds: ["me", "alice"],
      groupPublicKeys: { alice: "alice-key" },
    });

    expect(readiness.ready).toBe(true);
  });
});

describe("getEncryptionBlocker", () => {
  const notReady = getEncryptionReadiness({
    isGroup: false,
    hasKeys: false,
    currentUserId: "me",
    peerPublicKey: null,
    groupPublicKeys: {},
  });

  it("blocks sending text when encryption is unavailable", () => {
    expect(getEncryptionBlocker(notReady, true)).toMatch(
      /encryption not ready/i
    );
  });

  it("allows attachments-only sends", () => {
    expect(getEncryptionBlocker(notReady, false)).toBeNull();
  });

  it("allows text when encryption is ready", () => {
    expect(
      getEncryptionBlocker(
        {
          ready: true,
          isGroup: false,
          requiredIds: [],
          missingIds: [],
        },
        true
      )
    ).toBeNull();
  });

  it("explains specifically when group member keys are missing", () => {
    const groupNotReady = getEncryptionReadiness({
      isGroup: true,
      hasKeys: true,
      currentUserId: "me",
      peerPublicKey: null,
      participantIds: ["me", "bob"],
      groupPublicKeys: {},
    });

    expect(getEncryptionBlocker(groupNotReady, true)).toMatch(/group members/i);
  });
});
