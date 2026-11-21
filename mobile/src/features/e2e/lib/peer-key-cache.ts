const PEER_KEY_TTL_MS = 10 * 60 * 1000;

type CachedPeerKey = {
  publicKey: string;
  fetchedAt: number;
};

const peerKeyCache = new Map<string, CachedPeerKey>();

export function getCachedPeerKey(peerId: string): string | null {
  const cached = peerKeyCache.get(peerId);
  if (!cached) return null;

  if (Date.now() - cached.fetchedAt > PEER_KEY_TTL_MS) {
    peerKeyCache.delete(peerId);
    return null;
  }

  return cached.publicKey;
}

export function cachePeerKey(peerId: string, publicKey: string) {
  peerKeyCache.set(peerId, { publicKey, fetchedAt: Date.now() });
}

/**
 * Public keys can rotate or be re-provisioned on another device. Dropping the
 * in-memory cache on sign-out/account change avoids encrypting to a stale key.
 */
export function clearPeerKeyCache() {
  peerKeyCache.clear();
}
