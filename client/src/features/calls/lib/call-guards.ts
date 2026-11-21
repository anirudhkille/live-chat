/**
 * A call event is only meaningful for the call this client is currently in.
 * Events carrying a different call id are late/duplicate traffic from a
 * previous call and must be ignored. Events without an id retain the old
 * lenient behavior.
 */
export function isCallEventForCall(
  payload: { callId?: string | null } | null | undefined,
  currentCallId: string | null
): boolean {
  const callId = payload?.callId;
  if (!callId) return true;
  return callId === currentCallId;
}
