"use client"

import { useAuthStore } from "@/store/auth-store"

export function useAuth() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const hasHydrated = useAuthStore((state) => state.hasHydrated)

  return {
    token,
    user,
    hasHydrated,
    isAuthenticated: hasHydrated && !!token,
    isProfileComplete: hasHydrated && !!token && !!user?.name,
  }
}
