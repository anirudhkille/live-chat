import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { isValidCallId, validateInitiateCallId } from "./call.validation.js";

describe("call id validation", () => {
  it("accepts a fresh client-generated id", () => {
    assert.deepEqual(validateInitiateCallId({ callId: "call-123_abc" }), {
      ok: true,
    });
    assert.equal(isValidCallId("7f2c8c1e-0f4a-4a3c-9e6b-1a2b3c4d5e6f"), true);
  });

  it("rejects ids that already exist in call history", () => {
    assert.deepEqual(
      validateInitiateCallId({ callId: "call-123", persistedCall: true }),
      { ok: false, reason: "invalid" },
    );
  });

  it("rejects ids of an active or pending call", () => {
    assert.deepEqual(
      validateInitiateCallId({ callId: "call-123", activeCall: true }),
      { ok: false, reason: "busy" },
    );
    assert.deepEqual(
      validateInitiateCallId({ callId: "call-123", pendingCall: true }),
      { ok: false, reason: "busy" },
    );
  });

  it("rejects malformed ids", () => {
    for (const callId of ["", " ", "a".repeat(129), "bad id!", null]) {
      assert.deepEqual(validateInitiateCallId({ callId }), {
        ok: false,
        reason: "invalid",
      });
    }
  });
});
