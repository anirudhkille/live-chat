import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  api: {
    post: vi.fn(),
  },
}));

import { api } from "@/lib/api";
import { exchangeGoogleCode } from "./auth-api";

const postMock = vi.mocked(api.post);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("exchangeGoogleCode", () => {
  it("posts the one-time code with credentials and returns the session", async () => {
    const session = {
      user: {
        id: "user-1",
        name: "Ada",
        email: "ada@example.com",
        avatar: null,
      },
      accessToken: "access-token",
    };
    const payload = {
      success: true,
      message: "Logged in successfully",
      data: session,
    };
    postMock.mockResolvedValueOnce({ data: payload } as never);

    const result = await exchangeGoogleCode("one-time-code");

    expect(postMock).toHaveBeenCalledWith(
      "/auth/google/exchange",
      { code: "one-time-code" },
      { withCredentials: true }
    );
    expect(result).toEqual(payload);
  });
});
