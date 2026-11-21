import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";
import type { ApiResponse } from "@/types/api";
import { leaveGroup } from "./conversation-api";

type LeaveResponse = ApiResponse<{ left: boolean; deleted: boolean }>;

const axiosResponse = (payload: LeaveResponse) =>
  ({ data: payload }) as Awaited<ReturnType<typeof api.delete>>;

describe("leaveGroup", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the leave endpoint for the conversation", async () => {
    const payload: LeaveResponse = {
      success: true,
      message: "Left group",
      data: { left: true, deleted: false },
    };
    const deleteSpy = vi
      .spyOn(api, "delete")
      .mockResolvedValue(axiosResponse(payload));

    const result = await leaveGroup("conv-1");

    expect(deleteSpy).toHaveBeenCalledWith("/conversation/conv-1/leave");
    expect(result).toBe(payload);
  });

  it("returns the deleted flag when the last member leaves", async () => {
    const payload: LeaveResponse = {
      success: true,
      message: "Group deleted",
      data: { left: true, deleted: true },
    };
    const deleteSpy = vi
      .spyOn(api, "delete")
      .mockResolvedValue(axiosResponse(payload));

    await expect(leaveGroup("conv-2")).resolves.toEqual(payload);
    expect(deleteSpy).toHaveBeenCalledWith("/conversation/conv-2/leave");
  });
});
