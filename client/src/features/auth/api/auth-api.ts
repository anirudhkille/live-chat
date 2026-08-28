import type { ApiResponse, User } from "@/types/api";

import { api } from "@/lib/api";

export type AuthPayload = {
  user: User;
  accessToken: string;
};

export async function sendLoginOtp(email: string): Promise<ApiResponse> {
  const response = await api.post<ApiResponse>("/auth/send-login-otp", {
    email,
  });
  return response.data;
}

export async function verifyLoginOtp(payload: {
  email: string;
  otp: string;
}): Promise<ApiResponse<AuthPayload>> {
  const response = await api.post<ApiResponse<AuthPayload>>(
    "/auth/verify-login-otp",
    payload
  );
  return response.data;
}

export async function updateProfile(payload: {
  name: string;
}): Promise<ApiResponse<{ user: User }>> {
  const response = await api.patch<ApiResponse<{ user: User }>>(
    "/auth/profile",
    payload
  );
  return response.data;
}

export async function logoutRequest(): Promise<void> {
  await api.post("/auth/logout");
}
