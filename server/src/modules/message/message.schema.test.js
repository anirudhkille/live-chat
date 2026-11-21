import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { sendMessageSchema, updateMessageSchema } from "./message.schema.js";

const cuid = (n) => `c${String(n).padStart(24, "0")}`;

describe("message schemas", () => {
  it("caps message content at 4000 chars", () => {
    const ok = updateMessageSchema.safeParse({ content: "a".repeat(4000) });
    const tooLong = updateMessageSchema.safeParse({
      content: "a".repeat(4001),
    });

    assert.equal(ok.success, true);
    assert.equal(tooLong.success, false);
  });

  it("accepts optional cipherMeta and rejects oversized metadata", () => {
    const ok = updateMessageSchema.safeParse({
      content: "ciphertext",
      cipherMeta: { iv: "abc", tag: "def" },
    });
    const tooBig = updateMessageSchema.safeParse({
      content: "ciphertext",
      cipherMeta: { blob: "x".repeat(5000) },
    });

    assert.equal(ok.success, true);
    assert.equal(tooBig.success, false);
  });

  it("caps attachments at 10 ids", () => {
    const makeIds = (count) =>
      Array.from({ length: count }, (_, index) => cuid(index));

    assert.equal(
      sendMessageSchema.safeParse({ attachmentIds: makeIds(10) }).success,
      true,
    );
    assert.equal(
      sendMessageSchema.safeParse({ attachmentIds: makeIds(11) }).success,
      false,
    );
  });
});
