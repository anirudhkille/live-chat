import { useQuery } from "@tanstack/react-query";
import { getPeerPublicKey } from "../api/user-key-api";

const cache = new Map<string, string>();

export function usePeerPublicKey(peerId: string | null) {
  return useQuery({
    queryKey: ["user-key", "peer", peerId],
    queryFn: async () => {
      if (!peerId) return null;
      if (cache.has(peerId)) return cache.get(peerId)!;
      const { data } = await getPeerPublicKey(peerId);
      cache.set(peerId, data.publicKey);
      return data.publicKey;
    },
    enabled: !!peerId,
    staleTime: Infinity,
  });
}
