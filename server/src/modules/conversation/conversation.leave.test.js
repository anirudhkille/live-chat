import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { planLeaveGroup } from "./conversation.leave.js";

describe("planLeaveGroup", () => {
  it("rejects users who are not participants", () => {
    assert.deepEqual(
      planLeaveGroup([{ userId: "alice", role: "admin" }], "bob"),
      {
        allowed: false,
        deleted: false,
        promoteUserId: null,
      },
    );
  });

  it("deletes the group when the last member leaves", () => {
    assert.deepEqual(
      planLeaveGroup([{ userId: "alice", role: "admin" }], "alice"),
      {
        allowed: true,
        deleted: true,
        promoteUserId: null,
      },
    );
  });

  it("promotes the first remaining member when the only admin leaves", () => {
    const participants = [
      { userId: "alice", role: "admin" },
      { userId: "bob", role: "member" },
      { userId: "carol", role: "member" },
    ];

    assert.deepEqual(planLeaveGroup(participants, "alice"), {
      allowed: true,
      deleted: false,
      promoteUserId: "bob",
    });
  });

  it("does not promote when another admin remains", () => {
    const participants = [
      { userId: "alice", role: "admin" },
      { userId: "bob", role: "admin" },
      { userId: "carol", role: "member" },
    ];

    assert.deepEqual(planLeaveGroup(participants, "alice"), {
      allowed: true,
      deleted: false,
      promoteUserId: null,
    });
  });

  it("does not promote when a regular member leaves", () => {
    const participants = [
      { userId: "alice", role: "admin" },
      { userId: "bob", role: "member" },
    ];

    assert.deepEqual(planLeaveGroup(participants, "bob"), {
      allowed: true,
      deleted: false,
      promoteUserId: null,
    });
  });
});
