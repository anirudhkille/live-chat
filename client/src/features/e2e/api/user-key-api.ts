import { api } from "@/lib/api";
import type { ApiResponse } from "@/types/api";

export type UserKeyResponse = {
  hasKey: boolean;
  publicKey: string | null;
  recoveryBlob: unknown | null;
};

export type PeerKeyResponse = {
  publicKey: string;
};

export async function getOwnKey(): Promise<ApiResponse<UserKeyResponse>> {
  const response = await api.get<ApiResponse<UserKeyResponse>>("/user-key/me");
  return response.data;
}

export async function saveKey(args: {
  publicKey: string;
  recoveryBlob: unknown;
}): Promise<ApiResponse<UserKeyResponse>> {
  const response = await api.post<ApiResponse<UserKeyResponse>>(
    "/user-key",
    args
  );
  return response.data;
}

export async function getPeerPublicKey(
  peerId: string
): Promise<ApiResponse<PeerKeyResponse>> {
  const response = await api.get<ApiResponse<PeerKeyResponse>>(
    `/user-key/peer/${peerId}`
  );
  return response.data;
}
