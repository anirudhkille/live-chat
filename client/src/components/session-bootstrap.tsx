"use client";

import { useEffect, useRef } from "react";
import type { AxiosError } from "axios";

import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

/**
 * Restores an in-memory access token after reload using the httpOnly refresh
 * cookie. Without this, persisting the bearer token in localStorage would be
 * required to keep the session across reloads.
 */
export function SessionBootstrap() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const setToken = useAuthStore((s) => s.setToken);
  const clearSession = useAuthStore((s) => s.clearSession);
  const setIsRestoring = useAuthStore((s) => s.setIsRestoring);

  const startedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;

    if (token) {
      setIsRestoring(false);
      return;
    }

    if (!userId) {
      setIsRestoring(false);
      return;
    }

    if (startedForUserRef.current === userId) return;
    startedForUserRef.current = userId;

    let cancelled = false;
    setIsRestoring(true);

    api
      .get<{ data: { accessToken: string } }>("/auth/refresh")
      .then((response) => {
        if (cancelled) return;
        setToken(response.data.data.accessToken);
      })
      .catch((error: AxiosError) => {
        if (cancelled) return;
        const status = error.response?.status;
        if (status === 401 || status === 403) {
          clearSession();
          return;
        }
        setIsRestoring(false);
      })
      .finally(() => {
        if (!cancelled) setIsRestoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, token, userId, setToken, clearSession, setIsRestoring]);

  return null;
}
