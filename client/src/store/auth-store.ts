import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { User } from "@/types/api";

type AuthState = {
  /**
   * Access token intentionally lives only in memory. The refresh token is an
   * httpOnly cookie, so a reload rehydrates the session through
   * SessionBootstrap instead of reading a bearer token from localStorage.
   */
  token: string | null;
  user: User | null;
  hasHydrated: boolean;
  isRestoring: boolean;
  setSession: (session: { token: string; user?: User }) => void;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  clearSession: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  setIsRestoring: (isRestoring: boolean) => void;
};

type PersistedAuth = {
  user?: User | null;
};

const AUTH_STORAGE_KEY = "live-chat.auth";

/**
 * Older versions persisted the bearer token. Strip it immediately instead of
 * waiting for the next store update, so it cannot be read by page scripts.
 */
function sanitizeLegacyAuthStorage() {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw) as {
      state?: Record<string, unknown>;
      [key: string]: unknown;
    };
    if (!parsed.state || !("token" in parsed.state)) return;

    delete parsed.state.token;
    delete parsed.state.isRestoring;
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Corrupt storage is handled by zustand's normal hydration fallback.
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hasHydrated: false,
      isRestoring: false,
      setSession: ({ token, user }) =>
        set((state) => ({
          token,
          user: user ?? state.user,
          isRestoring: false,
        })),
      setToken: (token) => set({ token, isRestoring: false }),
      setUser: (user) => set({ user }),
      clearSession: () => set({ token: null, user: null, isRestoring: false }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setIsRestoring: (isRestoring) => set({ isRestoring }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedAuth => ({ user: state.user }),
      migrate: (persistedState) => {
        const persisted = persistedState as PersistedAuth | undefined;
        return { user: persisted?.user ?? null };
      },
      merge: (persistedState, currentState) => {
        const persisted = persistedState as PersistedAuth | undefined;
        return {
          ...currentState,
          user: persisted?.user ?? currentState.user,
          // Never restore a bearer token from older persisted payloads.
          token: null,
        };
      },
      onRehydrateStorage: () => (state) => {
        sanitizeLegacyAuthStorage();
        state?.setHasHydrated(true);
      },
    }
  )
);
