import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { toLastMessagePreview, toMessageResponse } from "./message.mapper.js";

const baseMessage = (overrides = {}) => ({
  id: "msg_1",
  senderId: "alice",
  conversationId: "conv_1",
  content: "hello",
  cipherMeta: null,
  deletedAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  attachments: [
    { id: "att_1", url: "https://cdn/attachments/alice/att_1.jpg" },
  ],
  reads: [],
  reactions: [],
  replyTo: null,
  ...overrides,
});

describe("toMessageResponse", () => {
  it("masks content and attachments for deleted messages", () => {
    const response = toMessageResponse(
      baseMessage({ deletedAt: new Date("2026-01-02T00:00:00.000Z") }),
    );

    assert.equal(response.content, null);
    assert.deepEqual(response.attachments, []);
  });

  it("does not expose reader ids or reads arrays", () => {
    const response = toMessageResponse(
      baseMessage({
        reads: [
          {
            userId: "bob",
            readAt: new Date("2026-01-01T01:00:00.000Z"),
            user: { readReceipts: true },
          },
        ],
      }),
    );

    assert.equal(response.reads, undefined);
    assert.ok(response.readAt instanceof Date);
  });

  it("hides readAt from readers who disabled read receipts", () => {
    const response = toMessageResponse(
      baseMessage({
        reads: [
          {
            userId: "bob",
            readAt: new Date("2026-01-01T01:00:00.000Z"),
            user: { readReceipts: false },
          },
        ],
      }),
    );

    assert.equal(response.readAt, null);
  });

  it("does not expose deleted reply content", () => {
    const response = toMessageResponse(
      baseMessage({
        replyTo: {
          id: "parent",
          senderId: "bob",
          sender: { name: "Bob" },
          content: "secret",
          cipherMeta: null,
          deletedAt: new Date("2026-01-02T00:00:00.000Z"),
          attachments: [],
        },
      }),
    );

    assert.equal(response.replyTo.content, null);
    assert.equal(response.replyTo.deleted, true);
    assert.equal(response.replyTo.preview, "Message deleted");
  });

  it("does not expose encrypted reply content", () => {
    const response = toMessageResponse(
      baseMessage({
        replyTo: {
          id: "parent",
          senderId: "bob",
          sender: { name: "Bob" },
          content: "ciphertext",
          cipherMeta: { iv: "abc" },
          deletedAt: null,
          attachments: [],
        },
      }),
    );

    assert.equal(response.replyTo.content, null);
    assert.equal(response.replyTo.encrypted, true);
    assert.equal(response.replyTo.preview, "Encrypted message");
  });
});

describe("toLastMessagePreview", () => {
  it("masks deleted and encrypted last messages", () => {
    assert.equal(
      toLastMessagePreview({
        id: "m1",
        content: "gone",
        createdAt: new Date(),
        deletedAt: new Date(),
        cipherMeta: null,
        sender: null,
      }).content,
      null,
    );

    assert.equal(
      toLastMessagePreview({
        id: "m2",
        content: "ciphertext",
        createdAt: new Date(),
        deletedAt: null,
        cipherMeta: { iv: "abc" },
        sender: null,
      }).content,
      null,
    );
  });

  it("keeps plaintext last message content", () => {
    const preview = toLastMessagePreview({
      id: "m3",
      content: "hello",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      deletedAt: null,
      cipherMeta: null,
      sender: { id: "alice", name: "Alice" },
    });

    assert.equal(preview.content, "hello");
    assert.deepEqual(preview.sender, { id: "alice", name: "Alice" });
  });
});
