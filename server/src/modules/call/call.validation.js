/**
 * Pure call-id rules shared by the socket handler and unit tests.
 *
 * Clients generate a `callId` and reuse it across broadcast/answer/hangup
 * events, so the server must accept the id but never let it point at a call
 * that is already active, pending, or recorded in history.
 */

export const CALL_ID_MAX_LENGTH = 128;
const CALL_ID_PATTERN = /^[A-Za-z0-9:_-]+$/;

export const isValidCallId = (callId) =>
  typeof callId === "string" &&
  callId.length > 0 &&
  callId.length <= CALL_ID_MAX_LENGTH &&
  CALL_ID_PATTERN.test(callId);

/**
 * @param {{
 *   callId: string,
 *   activeCall?: boolean,
 *   pendingCall?: boolean,
 *   persistedCall?: boolean,
 * }} input
 * @returns {{ ok: true } | { ok: false, reason: "invalid" | "busy" }}
 */
export const validateInitiateCallId = ({
  callId,
  activeCall = false,
  pendingCall = false,
  persistedCall = false,
}) => {
  if (!isValidCallId(callId)) {
    return { ok: false, reason: "invalid" };
  }
  if (persistedCall) {
    return { ok: false, reason: "invalid" };
  }
  if (activeCall || pendingCall) {
    return { ok: false, reason: "busy" };
  }
  return { ok: true };
};
