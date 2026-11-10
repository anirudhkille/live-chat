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

export const userKeyApi = {
  getOwnKey: async () => {
    const { data } =
      await api.get<ApiResponse<UserKeyResponse>>("/user-key/me");
    return data.data;
  },
  saveKey: async (args: {
    publicKey: string;
    recoveryBlob: unknown | null;
  }) => {
    const { data } = await api.post<ApiResponse<UserKeyResponse>>(
      "/user-key",
      args,
    );
    return data.data;
  },
  getPeerPublicKey: async (peerId: string) => {
    const { data } = await api.get<ApiResponse<PeerKeyResponse>>(
      `/user-key/peer/${peerId}`,
    );
    return data.data;
  },
};
