import { api } from "@/lib/api";
import type { ApiResponse, User } from "@/types/api";

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

/**
 * Native clients must identify themselves so the server includes the rotated
 * refresh token in JSON. Web clients receive it only as an httpOnly cookie.
 */
const MOBILE_HEADERS = { "X-Client": "mobile" } as const;

export const authApi = {
  sendOtp: async (email: string) => {
    const { data } = await api.post<ApiResponse<null>>(
      "/auth/send-login-otp",
      { email },
      { headers: MOBILE_HEADERS },
    );
    return data;
  },
  verifyOtp: async (email: string, otp: string) => {
    const { data } = await api.post<ApiResponse<LoginResponse>>(
      "/auth/verify-login-otp",
      {
        email,
        otp,
      },
      { headers: MOBILE_HEADERS },
    );
    return data.data;
  },
  googleLogin: async (idToken: string) => {
    const { data } = await api.post<ApiResponse<LoginResponse>>(
      "/auth/google/mobile",
      { idToken },
      { headers: MOBILE_HEADERS },
    );
    return data.data;
  },
  /**
   * Completes the OAuth deep-link flow (`livechat://auth/callback?code=...`).
   * The server consumes the one-time code and returns both tokens.
   */
  exchangeGoogleCode: async (code: string) => {
    const { data } = await api.post<ApiResponse<LoginResponse>>(
      "/auth/google/exchange",
      { code, client: "mobile" },
      { headers: MOBILE_HEADERS },
    );
    return data.data;
  },
  updateProfile: async (name: string) => {
    const { data } = await api.patch<ApiResponse<{ user: User }>>(
      "/auth/profile",
      { name },
    );
    return data.data.user;
  },
};
