import { useAuthStore } from "@/store/auth-store";

import { api } from "./api";
import { clearSessionState } from "./session-cleanup";
import {
  forgetRegisteredPushToken,
  getRegisteredPushToken,
} from "@/features/push-notifications/register";
import { pushApi } from "@/features/push-notifications/api";

/**
 * Revokes the refresh token, unregisters this device, then clears every piece
 * of local session state. Server/network failures are intentionally ignored:
 * a user tapping "Log out" must always end up signed out locally.
 */
export async function logout(): Promise<void> {
  const { refreshToken } = useAuthStore.getState();

  if (refreshToken) {
    try {
      await api.post(
        "/auth/logout",
        { refreshToken },
        {
          headers: { "X-Client": "mobile" },
          skipAuthRefresh: true,
        },
      );
    } catch {
      // The token may already be revoked or the device may be offline.
    }
  }

  const pushToken = getRegisteredPushToken();
  if (pushToken) {
    try {
      await pushApi.unregister(pushToken);
    } catch {
      // The server will prune uninstalled tokens on its own.
    }
    forgetRegisteredPushToken(pushToken);
  }

  clearSessionState();
}
