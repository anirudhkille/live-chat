import { afterEach, describe, expect, it, vi } from "vitest";

import {
  joinConversationRoom,
  leaveConversationRoom,
  resetConversationRooms,
  socket,
} from "./socket";

describe("conversation room helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("joins once and leaves only after every consumer leaves", () => {
    const emit = vi.spyOn(socket, "emit").mockReturnValue(socket);

    joinConversationRoom("conv-refcount");
    joinConversationRoom("conv-refcount");

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith("join-conversation", "conv-refcount");

    leaveConversationRoom("conv-refcount");
    expect(emit).toHaveBeenCalledTimes(1);

    leaveConversationRoom("conv-refcount");
    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenLastCalledWith(
      "leave-conversation",
      "conv-refcount"
    );
  });

  it("ignores a leave for a room that was never joined", () => {
    const emit = vi.spyOn(socket, "emit").mockReturnValue(socket);

    leaveConversationRoom("conv-unjoined");

    expect(emit).not.toHaveBeenCalled();
  });

  it("does nothing for empty conversation ids", () => {
    const emit = vi.spyOn(socket, "emit").mockReturnValue(socket);

    joinConversationRoom("");
    leaveConversationRoom("");

    expect(emit).not.toHaveBeenCalled();
  });

  it("resets every tracked room and forgets its refcounts", () => {
    const emit = vi.spyOn(socket, "emit").mockReturnValue(socket);

    joinConversationRoom("conv-reset-a");
    joinConversationRoom("conv-reset-b");
    joinConversationRoom("conv-reset-a");
    emit.mockClear();

    resetConversationRooms();

    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenCalledWith("leave-conversation", "conv-reset-a");
    expect(emit).toHaveBeenCalledWith("leave-conversation", "conv-reset-b");

    emit.mockClear();
    resetConversationRooms();
    expect(emit).not.toHaveBeenCalled();

    // A fresh join after the reset must re-join rather than reuse a refcount.
    joinConversationRoom("conv-reset-a");
    expect(emit).toHaveBeenCalledWith("join-conversation", "conv-reset-a");
  });
});
