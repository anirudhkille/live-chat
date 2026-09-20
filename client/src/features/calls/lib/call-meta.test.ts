import { describe, it, expect } from "vitest";

import { callDirection, callStatusLabel, callTone } from "./call-meta";
import type { CallLog } from "@/types/api";

const baseLog: CallLog = {
  id: "id-1",
  callId: "call-1",
  type: "voice",
  status: "completed",
  conversationId: "conv-1",
  callerId: "alice",
  calleeId: "bob",
  caller: { id: "alice", name: "Alice", avatar: null },
  callee: { id: "bob", name: "Bob", avatar: null },
  durationSeconds: 754,
  startedAt: "2026-09-20T10:00:00.000Z",
  answeredAt: "2026-09-20T10:00:02.000Z",
  endedAt: "2026-09-20T10:12:36.000Z",
};

describe("call-meta", () => {
  it("derives outgoing direction from the caller id", () => {
    expect(callDirection(baseLog, "alice")).toBe("outgoing");
    expect(callDirection(baseLog, "bob")).toBe("incoming");
    expect(callDirection(baseLog, undefined)).toBe("incoming");
  });

  it("returns labels only for missed and declined calls", () => {
    expect(callStatusLabel({ ...baseLog, status: "completed" })).toBeNull();
    expect(callStatusLabel({ ...baseLog, status: "missed" })).toBe("Missed");
    expect(callStatusLabel({ ...baseLog, status: "declined" })).toBe(
      "Declined"
    );
  });

  it("maps status to success/danger tones", () => {
    expect(callTone({ ...baseLog, status: "completed" })).toBe("success");
    expect(callTone({ ...baseLog, status: "missed" })).toBe("danger");
    expect(callTone({ ...baseLog, status: "declined" })).toBe("danger");
  });
});
