import { useCallStore } from "@/features/calls/call-store";
import { clearPeerKeyCache } from "@/features/e2e/lib/peer-key-cache";
import { useAuthStore } from "@/store/auth-store";

import { queryClient } from "./query-client";
import { resetSocketState } from "./socket";

/**
 * Clears everything scoped to the signed-in user while keeping the auth
 * session itself. Used when the account changes without an explicit logout.
 */
export function clearSharedSessionState() {
  queryClient.clear();
  clearPeerKeyCache();
  useCallStore.getState().reset();
  resetSocketState();
}

/**
 * Ends the local session. This does not call the server; `logout()` in
 * `lib/session.ts` performs the server and push-token cleanup first.
 */
export function clearSessionState() {
  clearSharedSessionState();
  useAuthStore.getState().clearSession();
}
