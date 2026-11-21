import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";

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

/**
 * Fetch the public keys for several participants at once. Queries share the
 * React Query cache with `usePeerPublicKey`, are deduplicated by user id, and
 * use one cache entry per user so participant list changes don't refetch keys
 * that are already known.
 */
export function usePeerPublicKeys(ids: string[]) {
  const idsKey = useMemo(
    () =>
      Array.from(new Set(ids.filter(Boolean)))
        .toSorted()
        .join("\u0000"),
    [ids],
  );
  const uniqueIds = useMemo(
    () => (idsKey ? idsKey.split("\u0000") : []),
    [idsKey],
  );

  const results = useQueries({
    queries: uniqueIds.map((peerId) => ({
      queryKey: ["user-key", "peer", peerId],
      queryFn: async () => {
        const cached = peerKeyCache.get(peerId);
        if (cached) return cached;

        const { publicKey } = await userKeyApi.getPeerPublicKey(peerId);
        peerKeyCache.set(peerId, publicKey);
        return publicKey;
      },
      staleTime: Infinity,
      gcTime: 1000 * 60 * 60,
      retry: false,
    })),
  });

  return useMemo(() => {
    const publicKeys: Record<string, string> = {};
    uniqueIds.forEach((id, index) => {
      const publicKey = results[index]?.data;
      if (publicKey) publicKeys[id] = publicKey;
    });
    return {
      publicKeys,
      isPending: results.some((result) => result.isPending),
      isFetching: results.some((result) => result.isFetching),
    };
  }, [uniqueIds, results]);
}
