import { useQuery } from "@tanstack/react-query";

import { userKeyApi } from "../api/user-key-api";

const peerKeyCache = new Map<string, string>();

export function usePeerPublicKey(peerId: string | null) {
  return useQuery({
    queryKey: ["user-key", "peer", peerId],
    queryFn: async () => {
      if (!peerId) return null;

      const cached = peerKeyCache.get(peerId);
      if (cached) return cached;

      const { publicKey } = await userKeyApi.getPeerPublicKey(peerId);
      peerKeyCache.set(peerId, publicKey);
      return publicKey;
    },
    enabled: Boolean(peerId),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    retry: false,
  });
}
