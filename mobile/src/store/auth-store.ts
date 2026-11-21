import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { User } from "@/types/api";

import {
  SECURE_AUTH_STORAGE_KEY,
  secureAuthStorage,
} from "./secure-auth-storage";

type AuthState = {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  hasHydrated: boolean;
  setSession: (session: {
    token: string;
    refreshToken?: string;
    user?: User;
  }) => void;
  setToken: (token: string) => void;
  setRefreshToken: (refreshToken: string) => void;
  setUser: (user: User) => void;
  clearSession: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      hasHydrated: false,
      setSession: ({ token, refreshToken, user }) =>
        set((state) => ({
          token,
          refreshToken: refreshToken ?? state.refreshToken,
          user: user ?? state.user,
        })),
      setToken: (token) => set({ token }),
      setRefreshToken: (refreshToken) => set({ refreshToken }),
      setUser: (user) => set({ user }),
      clearSession: () => set({ token: null, refreshToken: null, user: null }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: SECURE_AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => secureAuthStorage),
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        // Always release the auth gate, even if the keystore read failed.
        state?.setHasHydrated(true);
      },
    },
  ),
);
