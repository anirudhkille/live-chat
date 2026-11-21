import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
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
    gcTime: 1000 * 60 * 60,
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
        .sort()
        .join("\u0000"),
    [ids]
  );
  const uniqueIds = useMemo(
    () => (idsKey ? idsKey.split("\u0000") : []),
    [idsKey]
  );

  const results = useQueries({
    queries: uniqueIds.map((peerId) => ({
      queryKey: ["user-key", "peer", peerId],
      queryFn: async () => {
        if (cache.has(peerId)) return cache.get(peerId)!;
        const { data } = await getPeerPublicKey(peerId);
        cache.set(peerId, data.publicKey);
        return data.publicKey;
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
