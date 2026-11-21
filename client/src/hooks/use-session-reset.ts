"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { resetClientSessionState } from "@/lib/session-reset";
import { useAuthStore } from "@/store/auth-store";

/**
 * Watches the authenticated identity and clears all account-scoped caches when
 * it changes. Mounted inside the QueryClientProvider so it can also clear the
 * React Query cache on logout (including token expiry handled by the API
 * interceptor, which doesn't go through useLogout).
 */
export function SessionReset() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const token = useAuthStore((s) => s.token);
  const previousUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (previousUserIdRef.current === undefined) {
      previousUserIdRef.current = userId;
      return;
    }

    if (previousUserIdRef.current !== userId) {
      previousUserIdRef.current = userId;
      resetClientSessionState(queryClient);
    }
  }, [userId, queryClient]);

  useEffect(() => {
    if (!token) {
      resetClientSessionState(queryClient);
    }
  }, [token, queryClient]);

  return null;
}
