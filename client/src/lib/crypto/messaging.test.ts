import { describe, it, expect } from "vitest";
import {
  decryptGroupMessage,
  decryptMessage,
  encryptGroupMessage,
  encryptMessage,
} from "./messaging";
import { randomBytes } from "./crypto";
import { makeConversationKeys } from "./identity";

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

describe("group messaging", () => {
  it("encrypts an independent entry per recipient, including the sender", async () => {
    const alice = makeConversationKeys();
    const bob = makeConversationKeys();
    const carol = makeConversationKeys();
    const plaintext = "hello group";

    const encrypted = await encryptGroupMessage({
      privateKey: alice.privateKey,
      conversationId: "conv-group",
      currentUserId: "alice",
      plaintext,
      recipientPublicKeys: {
        alice: alice.publicKey,
        bob: bob.publicKey,
        carol: carol.publicKey,
      },
    });

    expect(encrypted).not.toBeNull();
    expect(encrypted!.cipherMeta.mode).toBe("group");
    expect(encrypted!.cipherMeta.entries.alice.iv).not.toBe(
      encrypted!.cipherMeta.entries.bob.iv
    );
    expect(encrypted!.content).toBe(
      encrypted!.cipherMeta.entries.alice.content
    );
    expect(encrypted!.cipherMeta.iv).toBe(
      encrypted!.cipherMeta.entries.alice.iv
    );

    const forAlice = await decryptGroupMessage({
      privateKey: alice.privateKey,
      conversationId: "conv-group",
      senderPublicKey: alice.publicKey,
      recipientId: "alice",
      cipherMeta: encrypted!.cipherMeta,
    });
    const forBob = await decryptGroupMessage({
      privateKey: bob.privateKey,
      conversationId: "conv-group",
      senderPublicKey: alice.publicKey,
      recipientId: "bob",
      cipherMeta: encrypted!.cipherMeta,
    });
    const forCarol = await decryptGroupMessage({
      privateKey: carol.privateKey,
      conversationId: "conv-group",
      senderPublicKey: alice.publicKey,
      recipientId: "carol",
      cipherMeta: encrypted!.cipherMeta,
    });

    expect(forAlice).toBe(plaintext);
    expect(forBob).toBe(plaintext);
    expect(forCarol).toBe(plaintext);
  });

  it("returns null when a required participant key is missing", async () => {
    const alice = makeConversationKeys();
    const bob = makeConversationKeys();

    const encrypted = await encryptGroupMessage({
      privateKey: alice.privateKey,
      conversationId: "conv-group",
      currentUserId: "alice",
      plaintext: "hi",
      recipientPublicKeys: {
        alice: alice.publicKey,
        bob: bob.publicKey,
        carol: "",
      },
      requiredRecipientIds: ["alice", "bob", "carol"],
    });

    expect(encrypted).toBeNull();
  });

  it("returns null when no entry can be produced", async () => {
    const alice = makeConversationKeys();

    const encrypted = await encryptGroupMessage({
      privateKey: alice.privateKey,
      conversationId: "conv-group",
      currentUserId: "alice",
      plaintext: "hi",
      recipientPublicKeys: { bob: "not-a-real-key" },
    });

    expect(encrypted).toBeNull();
  });

  it("returns null when the current user has no entry", async () => {
    const alice = makeConversationKeys();
    const bob = makeConversationKeys();

    const encrypted = await encryptGroupMessage({
      privateKey: alice.privateKey,
      conversationId: "conv-group",
      currentUserId: "alice",
      plaintext: "hi",
      recipientPublicKeys: { bob: bob.publicKey },
    });

    expect(encrypted).toBeNull();
  });
});
