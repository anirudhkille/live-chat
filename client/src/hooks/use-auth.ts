"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/store/auth-store";

export function useAuth() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isRestoring = useAuthStore((state) => state.isRestoring);

  return useMemo(
    () => ({
      token,
      user,
      hasHydrated,
      isRestoring,
      isAuthenticated: hasHydrated && !!token,
      isProfileComplete: hasHydrated && !!token && !!user?.name,
    }),
    [token, user, hasHydrated, isRestoring]
  );
}
