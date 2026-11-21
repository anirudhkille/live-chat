import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";

import { userKeyApi } from "../api/user-key-api";
import {
  cachePeerKey,
  clearPeerKeyCache,
  getCachedPeerKey,
} from "../lib/peer-key-cache";

export { clearPeerKeyCache };

const PEER_KEY_STALE_TIME_MS = 10 * 60 * 1000;

async function fetchPeerPublicKey(peerId: string): Promise<string> {
  const cached = getCachedPeerKey(peerId);
  if (cached) return cached;

  const { publicKey } = await userKeyApi.getPeerPublicKey(peerId);
  cachePeerKey(peerId, publicKey);
  return publicKey;
}

export function usePeerPublicKey(peerId: string | null) {
  return useQuery({
    queryKey: ["user-key", "peer", peerId],
    queryFn: () => {
      if (!peerId) return null;
      return fetchPeerPublicKey(peerId);
    },
    enabled: Boolean(peerId),
    staleTime: PEER_KEY_STALE_TIME_MS,
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
      queryFn: () => fetchPeerPublicKey(peerId),
      staleTime: PEER_KEY_STALE_TIME_MS,
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
      isError: results.some((result) => result.isError),
    };
  }, [uniqueIds, results]);
}
