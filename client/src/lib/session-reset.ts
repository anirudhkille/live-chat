import type { QueryClient } from "@tanstack/react-query";

import { clearIdentityMemory } from "@/features/e2e/lib/keyManager";
import { clearPeerPublicKeyCache } from "@/features/e2e/hooks/usePeerPublicKey";
import { useCallStore } from "@/features/calls/call-store";
import { useChatStore } from "@/store/chat-store";
import { resetConversationRooms } from "@/lib/socket";

/**
 * Drop every piece of state that belongs to the signed-in account. Called on
 * logout and whenever the authenticated user id changes, so the next account
 * never sees the previous user's cached messages, keys or call state.
 */
export function resetClientSessionState(queryClient: QueryClient): void {
  queryClient.clear();
  useChatStore.getState().reset();
  useCallStore.getState().reset();
  clearPeerPublicKeyCache();
  clearIdentityMemory();
  resetConversationRooms();
}
