export type EncryptionReadiness = {
  ready: boolean;
  isGroup: boolean;
  /** Every participant whose key is required for this send. */
  requiredIds: string[];
  /** Participants whose key is not available yet. */
  missingIds: string[];
};

/**
 * Work out whether a message can be encrypted right now. Group sends require
 * a key for every current participant (including the sender); DM sends require
 * the peer's public key and the local identity.
 */
export function getEncryptionReadiness(args: {
  isGroup: boolean;
  hasKeys: boolean;
  currentUserId: string | null;
  peerPublicKey: string | null | undefined;
  participantIds?: string[];
  groupPublicKeys: Record<string, string>;
}): EncryptionReadiness {
  if (!args.isGroup) {
    return {
      ready: !!args.hasKeys && !!args.peerPublicKey,
      isGroup: false,
      requiredIds: [],
      missingIds: [],
    };
  }

  const requiredIds = Array.from(
    new Set(
      [...(args.participantIds ?? []), args.currentUserId].filter(
        (id): id is string => Boolean(id)
      )
    )
  ).sort();

  if (!args.hasKeys || !args.currentUserId) {
    return {
      ready: false,
      isGroup: true,
      requiredIds,
      missingIds: requiredIds,
    };
  }

  const missingIds = requiredIds.filter(
    (id) => !args.groupPublicKeys[id] && id !== args.currentUserId
  );

  return {
    ready: requiredIds.length > 0 && missingIds.length === 0,
    isGroup: true,
    requiredIds,
    missingIds,
  };
}

/**
 * The inline error shown when the user tries to send text while encryption is
 * unavailable. Returns null when the send may proceed (including
 * attachments-only sends, which are always allowed but are not encrypted).
 */
export function getEncryptionBlocker(
  readiness: EncryptionReadiness,
  hasText: boolean
): string | null {
  if (!hasText || readiness.ready) return null;

  if (readiness.missingIds.length > 0) {
    return "Encryption keys are unavailable for some group members. Try again once their keys have loaded.";
  }

  return readiness.isGroup
    ? "Encryption not ready. Try again once your group keys have loaded."
    : "Encryption not ready. Try again in a moment.";
}
