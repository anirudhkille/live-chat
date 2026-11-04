import { api } from "@/lib/api";
import type { ApiResponse, User } from "@/types/api";

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export const authApi = {
  sendOtp: async (email: string) => {
    const { data } = await api.post<ApiResponse<null>>("/auth/send-login-otp", { email });
    return data;
  },
  verifyOtp: async (email: string, otp: string) => {
    const { data } = await api.post<ApiResponse<LoginResponse>>("/auth/verify-login-otp", {
      email,
      otp,
    });
    return data.data;
  },
  refresh: async () => {
    const { data } = await api.get<ApiResponse<{ accessToken: string }>>("/auth/refresh");
    return data.data.accessToken;
  },
};