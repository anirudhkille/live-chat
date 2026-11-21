import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  isAttachmentOwnedBy,
  validateAttachmentClaim,
} from "./attachment.ownership.js";

const attachment = (overrides = {}) => ({
  id: "att_1",
  url: "https://cdn.example.com/attachments/alice/att_1.jpg",
  messageId: null,
  ...overrides,
});

describe("attachment ownership", () => {
  it("accepts an unclaimed attachment stored under the sender prefix", () => {
    assert.equal(isAttachmentOwnedBy(attachment(), "alice"), true);
    assert.deepEqual(
      validateAttachmentClaim({
        attachments: [attachment()],
        attachmentIds: ["att_1"],
        senderId: "alice",
      }),
      { ok: true },
    );
  });

  it("rejects an attachment owned by another user", () => {
    assert.equal(isAttachmentOwnedBy(attachment(), "bob"), false);
    assert.deepEqual(
      validateAttachmentClaim({
        attachments: [attachment()],
        attachmentIds: ["att_1"],
        senderId: "bob",
      }),
      {
        ok: false,
        status: 403,
        message: "One or more attachments do not belong to you",
      },
    );
  });

  it("rejects attachments that are already attached to a message", () => {
    assert.deepEqual(
      validateAttachmentClaim({
        attachments: [attachment({ messageId: "msg_1" })],
        attachmentIds: ["att_1"],
        senderId: "alice",
      }),
      {
        ok: false,
        status: 400,
        message: "One or more attachments are already in use",
      },
    );
  });

  it("rejects unknown and duplicate attachment ids", () => {
    assert.deepEqual(
      validateAttachmentClaim({
        attachments: [],
        attachmentIds: ["missing"],
        senderId: "alice",
      }),
      {
        ok: false,
        status: 400,
        message: "One or more attachments were not found",
      },
    );

    assert.deepEqual(
      validateAttachmentClaim({
        attachments: [attachment()],
        attachmentIds: ["att_1", "att_1"],
        senderId: "alice",
      }),
      {
        ok: false,
        status: 400,
        message: "Duplicate attachment ids are not allowed",
      },
    );
  });

  it("treats an empty request as valid", () => {
    assert.deepEqual(
      validateAttachmentClaim({
        attachments: [],
        attachmentIds: [],
        senderId: "alice",
      }),
      { ok: true },
    );
  });
});
