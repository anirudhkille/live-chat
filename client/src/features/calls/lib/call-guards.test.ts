import { describe, expect, it } from "vitest";
import { isCallEventForCall } from "./call-guards";

describe("isCallEventForCall", () => {
  it("accepts events for the current call", () => {
    expect(isCallEventForCall({ callId: "call-1" }, "call-1")).toBe(true);
  });

  it("ignores events for a different or stale call", () => {
    expect(isCallEventForCall({ callId: "call-old" }, "call-1")).toBe(false);
    expect(isCallEventForCall({ callId: "call-old" }, null)).toBe(false);
  });

  it("keeps accepting id-less legacy events", () => {
    expect(isCallEventForCall(undefined, "call-1")).toBe(true);
    expect(isCallEventForCall({}, "call-1")).toBe(true);
    expect(isCallEventForCall({ callId: null }, "call-1")).toBe(true);
  });
});
