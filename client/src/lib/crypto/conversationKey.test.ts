import { describe, it, expect } from "vitest";
import { deriveConversationKey } from "./conversationKey";
import { makeConversationKeys } from "./identity";

describe("conversationKey", () => {
  it("both sides derive the same key", () => {
    const alice = makeConversationKeys();
    const bob = makeConversationKeys();

    const keyA = deriveConversationKey({
      privateKey: alice.privateKey,
      peerPublicKey: bob.publicKey,
      conversationId: "conv-123",
    });
    const keyB = deriveConversationKey({
      privateKey: bob.privateKey,
      peerPublicKey: alice.publicKey,
      conversationId: "conv-123",
    });

    expect(keyA).toEqual(keyB);
  });

  it("different conversation ids produce different keys", () => {
    const alice = makeConversationKeys();
    const bob = makeConversationKeys();

    const keyA = deriveConversationKey({
      privateKey: alice.privateKey,
      peerPublicKey: bob.publicKey,
      conversationId: "conv-a",
    });
    const keyB = deriveConversationKey({
      privateKey: alice.privateKey,
      peerPublicKey: bob.publicKey,
      conversationId: "conv-b",
    });

    expect(keyA).not.toEqual(keyB);
  });
});
